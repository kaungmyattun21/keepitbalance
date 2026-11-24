import { createHash } from "node:crypto";
import type { ConfirmReceiptValues, ReceiptDetail, UploadReceipt } from "@keepitbalance/shared/receipts";
import type { Page } from "@keepitbalance/shared/api";
import { prisma } from "../../../../shared/db.ts";
import { badRequest, conflict, notFound } from "../../../../shared/errors.ts";
import { decodeReceiptImage } from "./image.ts";
import { getReceiptQueue, RECEIPT_QUEUE, scheduleExtraction } from "./queue.ts";
import { receiptSelect, toReceiptResponse, type ReceiptRow } from "./receipt-response.ts";
import * as repository from "./repository.ts";

export async function uploadReceipt(userId: string, input: UploadReceipt) {
  const data = await decodeReceiptImage(input);
  const contentHash = createHash("sha256").update(data).digest("hex");
  await getReceiptQueue();
  return prisma.$transaction(async (tx) => {
    // Serialize uploads for this owner; the unique index also enforces identity.
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId}::uuid FOR UPDATE`;
    const existing = await tx.receipt.findUnique({
      where: { userId_contentHash: { userId, contentHash } },
      select: receiptSelect,
    });
    if (existing) return { receipt: toReceiptResponse(existing), duplicate: true };
    const receipt = await tx.receipt.create({
      data: { userId, contentHash, image: { create: { data, contentType: input.contentType } } },
      select: receiptSelect,
    });
    await scheduleExtraction(tx, { receiptId: receipt.id, version: receipt.version });
    return { receipt: toReceiptResponse(receipt), duplicate: false };
  });
}

// Reconcile jobs that exhausted retries after a worker crash, not only caught errors.
async function refreshFailure(row: ReceiptRow): Promise<ReceiptRow> {
  if (!row.jobId || !["queued", "processing"].includes(row.status)) return row;
  const boss = await getReceiptQueue();
  const job = await boss.getJobById(RECEIPT_QUEUE, row.jobId);
  if (job && !["failed", "cancelled"].includes(job.state)) return row;
  const updated = await prisma.receipt.updateMany({
    where: { id: row.id, version: row.version, status: { in: ["queued", "processing"] } },
    data: { status: "failed", error: "Receipt processing stopped. You can retry this receipt." },
  });
  return updated.count
    ? { ...row, status: "failed", error: "Receipt processing stopped. You can retry this receipt." }
    : row;
}

export async function getReceipt(userId: string, id: string): Promise<ReceiptDetail> {
  const row = await repository.findReceipt(userId, id);
  if (!row) throw notFound("Receipt not found");
  const refreshed = await refreshFailure(row);
  // A worker may have finished during reconciliation; return its current draft.
  const current = await repository.findReceipt(userId, id);
  return { ...toReceiptResponse(current ?? refreshed), rawText: current?.rawText ?? row.rawText };
}

export async function listReceipts(
  userId: string,
  page: number,
  pageSize: number,
  unconfirmed = false,
): Promise<Page<ReturnType<typeof toReceiptResponse>>> {
  const [rows, total] = await repository.listReceipts(userId, page, pageSize, unconfirmed);
  const refreshed = await Promise.all(rows.map(refreshFailure));
  return {
    data: refreshed.map(toReceiptResponse),
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function retryReceipt(userId: string, id: string) {
  await getReceipt(userId, id);
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM receipts WHERE id = ${id}::uuid AND user_id = ${userId}::uuid FOR UPDATE`;
    const receipt = await tx.receipt.findFirst({ where: { id, userId }, select: receiptSelect });
    if (!receipt) throw notFound("Receipt not found");
    // A repeated retry request returns the currently queued attempt.
    if (["queued", "processing"].includes(receipt.status)) return toReceiptResponse(receipt);
    if (!["failed", "needs_review"].includes(receipt.status))
      throw conflict("CONFLICT", "A confirmed receipt cannot be reprocessed.");
    const row = await tx.receipt.update({
      where: { id },
      data: { status: "queued", error: null, version: { increment: 1 } },
      select: receiptSelect,
    });
    await scheduleExtraction(tx, { receiptId: id, version: row.version });
    return toReceiptResponse(row);
  });
}

export async function confirmReceipt(userId: string, id: string, input: ConfirmReceiptValues) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM receipts WHERE id = ${id}::uuid AND user_id = ${userId}::uuid FOR UPDATE`;
    const receipt = await tx.receipt.findFirst({ where: { id, userId }, select: receiptSelect });
    if (!receipt) throw notFound("Receipt not found");
    if (receipt.status === "confirmed") return toReceiptResponse(receipt);
    if (!["needs_review", "failed"].includes(receipt.status)) {
      throw conflict("CONFLICT", "Wait for processing before recording this purchase.");
    }
    const category = await tx.category.findFirst({
      where: { id: input.categoryId, userId },
      select: { type: true },
    });
    if (!category) throw notFound("Category not found");
    if (category.type !== "EXPENSE")
      throw badRequest("CATEGORY_TYPE_MISMATCH", "Choose an expense category.");
    const transaction = await tx.transaction.create({
      data: {
        userId,
        categoryId: input.categoryId,
        type: "EXPENSE",
        amount: input.amount,
        date: new Date(`${input.date}T00:00:00.000Z`),
        note: input.note || input.merchant || null,
      },
      select: { id: true },
    });
    const row = await tx.receipt.update({
      where: { id },
      data: { status: "confirmed", transactionId: transaction.id, error: null },
      select: receiptSelect,
    });
    return toReceiptResponse(row);
  });
}

export async function getReceiptImage(userId: string, id: string) {
  const image = await repository.findImage(userId, id);
  if (!image) throw notFound("Receipt image not found");
  return image;
}
