import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "../../../../shared/db.ts";
import { newAgent, signUp, type Agent } from "../../../../test/http.ts";
import { getReceiptQueue, RECEIPT_QUEUE, type ReceiptJob } from "./queue.ts";
import * as queue from "./queue.ts";
import * as ocr from "./ocr-provider.ts";
import { processReceipt, startReceiptWorker } from "./processor.ts";
import * as transactionRepository from "../transactions/repository.ts";

let agent: Agent;
let photo: { contentType: string; data: string };
let categoryId: string;
const text =
  "FRESH MARKET\n2026-11-09\nMILK 3.50\nBREAD 2.00\nSUBTOTAL 5.50\nTAX 0.55\nTOTAL 6.05\nCASH 10.00\nCHANGE 3.95";

beforeEach(async () => {
  const boss = await getReceiptQueue();
  await boss.deleteAllJobs(RECEIPT_QUEUE);
  agent = newAgent();
  await signUp(agent);
  const categories = await agent.get("/api/v1/categories");
  categoryId = categories.body.data.find((row: { type: string }) => row.type === "expense").id;
  const image = await sharp({ create: { width: 100, height: 100, channels: 3, background: "white" } })
    .png()
    .toBuffer();
  photo = { contentType: "image/png", data: image.toString("base64") };
});

afterEach(async () => {
  const boss = await getReceiptQueue();
  await boss.offWork(RECEIPT_QUEUE);
  await boss.deleteAllJobs(RECEIPT_QUEUE);
  vi.restoreAllMocks();
});

async function upload() {
  const response = await agent.post("/api/v1/receipts").send(photo);
  expect(response.status).toBe(202);
  return response.body.data.id as string;
}
async function fetchJob() {
  const boss = await getReceiptQueue();
  const [job] = await boss.fetch<ReceiptJob>(RECEIPT_QUEUE, { includeMetadata: true });
  expect(job).toBeDefined();
  return job!;
}
const purchase = () => ({ categoryId, amount: "6.05", date: "2026-11-09", merchant: "Fresh Market" });

describe("receipt jobs", () => {
  it("saves a normal transaction with its receipt while OCR is pending and exposes it in details", async () => {
    const id = await upload();
    const job = await fetchJob();
    const response = await agent
      .post("/api/v1/transactions")
      .send({ ...purchase(), type: "expense", receiptId: id });
    expect(response.status).toBe(201);
    expect(response.body.receipt).toEqual({ id, imageUrl: `/receipts/${id}/image` });
    const detail = await agent.get(`/api/v1/transactions/${response.body.id}`);
    expect(detail.status).toBe(200);
    expect(detail.body.receipt).toEqual(response.body.receipt);
    expect(detail.body.rawText).toBeUndefined();
    expect((await agent.get(`/api/v1/receipts/${id}`)).body.data.status).toBe("confirmed");
    expect((await agent.get("/api/v1/receipts?unconfirmed=true")).body.data).toHaveLength(0);
    const lateRecognition = vi.fn(async () => text);
    await processReceipt(job, lateRecognition);
    expect(lateRecognition).not.toHaveBeenCalled();
    expect((await newAgent().get(`/api/v1/transactions/${response.body.id}`)).status).toBe(401);
    const other = newAgent();
    await signUp(other, { email: "detail-other@example.com" });
    expect((await other.get(`/api/v1/transactions/${response.body.id}`)).status).toBe(404);
  });

  it("creates only one transaction when a receipt form is submitted concurrently", async () => {
    const id = await upload();
    const body = { ...purchase(), type: "expense", receiptId: id };
    const [first, second] = await Promise.all([
      agent.post("/api/v1/transactions").send(body),
      agent.post("/api/v1/transactions").send(body),
    ]);
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(first.body.id).toBe(second.body.id);
    expect(await prisma.transaction.count()).toBe(1);
  });

  it("attaches receipts on edit, preserves them on ordinary edits, and prevents reuse or replacement", async () => {
    const id = await upload();
    const body = { ...purchase(), type: "expense" };
    const original = await agent.post("/api/v1/transactions").send(body);
    expect(original.body.receipt).toBeNull();
    const attached = await agent
      .put(`/api/v1/transactions/${original.body.id}`)
      .send({ ...body, receiptId: id });
    expect(attached.status).toBe(200);
    expect(attached.body.receipt.id).toBe(id);
    const edited = await agent
      .put(`/api/v1/transactions/${original.body.id}`)
      .send({ ...body, amount: "9.00" });
    expect(edited.body.receipt.id).toBe(id);
    const different = await agent.post("/api/v1/transactions").send(body);
    expect(
      (
        await agent
          .put(`/api/v1/transactions/${different.body.id}`)
          .send({ ...body, receiptId: id, amount: "50.00" })
      ).status,
    ).toBe(409);
    expect((await agent.get(`/api/v1/transactions/${different.body.id}`)).body.amount).toBe("6.05");
    photo.data = (
      await sharp({ create: { width: 101, height: 100, channels: 3, background: "white" } })
        .png()
        .toBuffer()
    ).toString("base64");
    const replacement = await upload();
    expect(
      (await agent.put(`/api/v1/transactions/${original.body.id}`).send({ ...body, receiptId: replacement }))
        .status,
    ).toBe(409);
    expect((await agent.get(`/api/v1/receipts/${replacement}`)).body.data.status).toBe("queued");
  });

  it("checks receipt ownership and rolls back transaction creation if attachment fails", async () => {
    const id = await upload();
    const other = newAgent();
    await signUp(other, { email: "attach-other@example.com" });
    const categories = await other.get("/api/v1/categories");
    const ownCategory = categories.body.data.find((row: { type: string }) => row.type === "expense").id;
    expect(
      (
        await other
          .post("/api/v1/transactions")
          .send({ ...purchase(), categoryId: ownCategory, type: "expense", receiptId: id })
      ).status,
    ).toBe(404);
    expect(await prisma.transaction.count()).toBe(0);
    vi.spyOn(transactionRepository, "attachReceipt").mockRejectedValueOnce(
      new Error("Simulated attachment failure"),
    );
    expect(
      (await agent.post("/api/v1/transactions").send({ ...purchase(), type: "expense", receiptId: id }))
        .status,
    ).toBe(500);
    expect(await prisma.transaction.count()).toBe(0);
    expect((await agent.get(`/api/v1/receipts/${id}`)).body.data.status).toBe("queued");
  });

  it("accepts a receipt as evidence for an income transaction", async () => {
    const id = await upload();
    const categories = await agent.get("/api/v1/categories");
    const incomeCategory = categories.body.data.find((row: { type: string }) => row.type === "income").id;
    const response = await agent
      .post("/api/v1/transactions")
      .send({ ...purchase(), categoryId: incomeCategory, type: "income", receiptId: id });
    expect(response.status).toBe(201);
    expect(response.body.type).toBe("income");
    expect(response.body.receipt.id).toBe(id);
  });

  it("persists uploads with jobs, reuses identical files concurrently, and isolates users", async () => {
    const [first, second] = await Promise.all([
      agent.post("/api/v1/receipts").send(photo),
      agent.post("/api/v1/receipts").send(photo),
    ]);
    expect([first.status, second.status].sort()).toEqual([200, 202]);
    expect(first.body.data.id).toBe(second.body.data.id);
    expect(await prisma.receipt.count()).toBe(1);
    const row = await prisma.receipt.findFirstOrThrow();
    expect(row.jobId).toBeTruthy();
    const boss = await getReceiptQueue();
    const jobs = await boss.findJobs<ReceiptJob>(RECEIPT_QUEUE, { queued: true });
    expect(jobs).toHaveLength(1);
    expect(jobs[0]!.data).toEqual({ receiptId: row.id, version: 1 });
    const other = newAgent();
    await signUp(other, { email: "other@example.com" });
    expect((await other.get(`/api/v1/receipts/${row.id}`)).status).toBe(404);
    expect((await other.get(`/api/v1/receipts/${row.id}/image`)).status).toBe(404);
    expect((await other.post(`/api/v1/receipts/${row.id}/retry`)).status).toBe(404);
    expect((await other.post(`/api/v1/receipts/${row.id}/confirm`).send(purchase())).status).toBe(404);
    const separate = await other.post("/api/v1/receipts").send(photo);
    expect(separate.status).toBe(202);
    expect(separate.body.data.id).not.toBe(row.id);
  });

  it("rolls back the receipt and image if scheduling fails", async () => {
    vi.spyOn(queue, "scheduleExtraction").mockRejectedValueOnce(new Error("Simulated queue outage"));
    expect((await agent.post("/api/v1/receipts").send(photo)).status).toBe(500);
    expect(await prisma.receipt.count()).toBe(0);
    expect(await prisma.receiptImage.count()).toBe(0);
  });

  it("allows work after the upload response and reuses results on repeated execution", async () => {
    const id = await upload();
    expect((await agent.get(`/api/v1/receipts/${id}`)).body.data.status).toBe("queued");
    const job = await fetchJob();
    const recognize = vi.fn(async () => text);
    await processReceipt(job, recognize);
    await processReceipt(job, recognize);
    expect(recognize).toHaveBeenCalledTimes(1);
    const response = await agent.get(`/api/v1/receipts/${id}`);
    expect(response.body.data.status).toBe("needs_review");
    expect(response.body.data.draft).toMatchObject({
      merchant: "FRESH MARKET",
      date: "2026-11-09",
      total: "6.05",
    });
    expect(response.body.data.rawText).toBe(text);
    const duplicate = await agent.post("/api/v1/receipts").send(photo);
    expect(duplicate.status).toBe(200);
    expect(duplicate.body.data.status).toBe("needs_review");
    expect(await prisma.transaction.count()).toBe(0);
  });

  it("confirms once under concurrent requests and updates category budget spending", async () => {
    const id = await upload();
    expect((await agent.post(`/api/v1/receipts/${id}/confirm`).send(purchase())).status).toBe(409);
    await processReceipt(await fetchJob(), async () => text);
    await agent.put("/api/v1/budgets").send({ budgets: [{ categoryId, amount: "100.00" }] });
    const responses = await Promise.all([
      agent.post(`/api/v1/receipts/${id}/confirm`).send(purchase()),
      agent.post(`/api/v1/receipts/${id}/confirm`).send(purchase()),
    ]);
    expect(responses.map((response) => response.status)).toEqual([200, 200]);
    expect(responses[0]!.body.data.transactionId).toBe(responses[1]!.body.data.transactionId);
    const transactions = await prisma.transaction.findMany();
    expect(transactions).toHaveLength(1);
    expect(transactions[0]!.amount.toFixed(2)).toBe("6.05");
    expect(transactions[0]!.note).toBe("Fresh Market");
    const budgets = await agent.get("/api/v1/budgets?month=2026-11");
    expect(budgets.body.totalSpent).toBe("6.05");
    expect((await agent.delete(`/api/v1/transactions/${transactions[0]!.id}`)).status).toBe(409);
    expect((await agent.post(`/api/v1/receipts/${id}/retry`)).status).toBe(409);
  });

  it("reprocesses a draft on request without losing deduplication or accepting old jobs", async () => {
    const id = await upload();
    const oldJob = await fetchJob();
    await processReceipt(oldJob, async () => text);
    const response = await agent.post(`/api/v1/receipts/${id}/retry`);
    expect(response.status).toBe(202);
    expect(response.body.data).toMatchObject({ id, status: "queued", extractionVersion: 2 });
    const stale = vi.fn(async () => "OLD RESULT");
    await processReceipt(oldJob, stale);
    expect(stale).not.toHaveBeenCalled();
    const duplicate = await agent.post("/api/v1/receipts").send(photo);
    expect(duplicate.body.data).toMatchObject({ id, extractionVersion: 2 });
    const job = await fetchJob();
    await processReceipt(job, async () => ({ text: "WHOLESALE\nCOSTCO\nTOTAL 20.00", confidence: 45 }));
    const updated = await agent.get(`/api/v1/receipts/${id}`);
    expect(updated.body.data.draft).toMatchObject({ merchant: "Costco", total: "20.00" });
    expect(updated.body.data.draft.warnings.join(" ")).toContain("confidence is low");
    expect(await prisma.transaction.count()).toBe(0);
  });

  it("keeps temporary failures processing, allows retry after exhaustion, and rejects old results", async () => {
    const id = await upload();
    const job = await fetchJob();
    const fail = vi.fn(async (): Promise<string> => {
      throw new Error("OCR unavailable");
    });
    await expect(processReceipt(job, fail)).rejects.toThrow("Receipt extraction failed");
    expect((await prisma.receipt.findUniqueOrThrow({ where: { id } })).status).toBe("processing");
    await expect(processReceipt({ ...job, retryCount: job.retryLimit }, fail)).rejects.toThrow();
    expect((await agent.get(`/api/v1/receipts/${id}`)).body.data.status).toBe("failed");
    expect((await agent.post(`/api/v1/receipts/${id}/retry`)).status).toBe(202);
    expect((await agent.post(`/api/v1/receipts/${id}/retry`)).status).toBe(202);
    const old = vi.fn(async () => "OLD RESULT");
    await processReceipt(job, old);
    expect(old).not.toHaveBeenCalled();
    const next = await fetchJob();
    expect(next.data.version).toBe(2);
    await processReceipt(next, async () => text);
    expect((await agent.get(`/api/v1/receipts/${id}`)).body.data.status).toBe("needs_review");
  });

  it("recognizes exhausted jobs after a crash and permits manual entry", async () => {
    const id = await upload();
    const row = await prisma.receipt.findUniqueOrThrow({ where: { id } });
    const boss = await getReceiptQueue();
    await boss.cancel(RECEIPT_QUEUE, row.jobId!);
    expect((await agent.get(`/api/v1/receipts/${id}`)).body.data.status).toBe("failed");
    expect((await agent.post(`/api/v1/receipts/${id}/confirm`).send(purchase())).body.data.status).toBe(
      "confirmed",
    );
  });

  it("rejects invalid images and protects private originals", async () => {
    expect((await newAgent().post("/api/v1/receipts").send(photo)).status).toBe(401);
    for (const invalid of [
      { ...photo, contentType: "image/jpeg" },
      { ...photo, data: "not an image" },
      { ...photo, data: Buffer.from("fake png").toString("base64") },
    ])
      expect((await agent.post("/api/v1/receipts").send(invalid)).status).toBe(400);
    expect(await prisma.receipt.count()).toBe(0);
    const id = await upload();
    const image = await agent.get(`/api/v1/receipts/${id}/image`);
    expect(image.headers["cache-control"]).toBe("private, no-store");
    expect(image.body.toString("base64")).toBe(photo.data);
  });

  it("runs the real worker and bundled Tesseract model without a cloud service", async () => {
    const image = await sharp(
      Buffer.from(
        `<svg width="1200" height="650" xmlns="http://www.w3.org/2000/svg"><rect width="1200" height="650" fill="white"/><g fill="black" font-family="sans-serif" font-size="56"><text x="50" y="100">FRESH MARKET</text><text x="50" y="200">2026-11-09</text><text x="50" y="300">MILK 3.50</text><text x="50" y="400">BREAD 2.00</text><text x="50" y="500">TOTAL 5.50</text></g></svg>`,
      ),
    )
      .png()
      .toBuffer();
    photo.data = image.toString("base64");
    const id = await upload();
    await startReceiptWorker();
    await vi.waitFor(
      async () => {
        const row = await prisma.receipt.findUniqueOrThrow({ where: { id } });
        expect(row.status).toBe("needs_review");
        expect(row.rawText).toContain("FRESH MARKET");
        expect(row.draft).toMatchObject({ total: "5.50" });
      },
      { timeout: 30_000, interval: 200 },
    );
    expect(ocr.recognizeReceipt).toBeDefined();
  }, 35_000);
});
