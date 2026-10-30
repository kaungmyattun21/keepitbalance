import type { Bill } from "@keepitbalance/shared/finance";
import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../../../../shared/db.ts";
import { newAgent, signUp, testUser, type Agent } from "../../../../test/http.ts";
import * as repository from "./repository.ts";

let agent: Agent;
let categoryId: string;
const valid = { name: "Internet", amount: "42.5", frequency: "monthly", nextDueDate: "2026-01-31" };

beforeEach(async () => {
  agent = newAgent();
  await signUp(agent);
  categoryId = (
    await prisma.category.findFirstOrThrow({
      where: { user: { email: testUser.email }, name: "Bills", type: "EXPENSE" },
    })
  ).id;
});

async function create(overrides: object = {}): Promise<Bill> {
  const response = await agent.post("/api/v1/bills").send({ ...valid, categoryId, ...overrides });
  expect(response.status).toBe(201);
  return response.body as Bill;
}
const payment = (bill: Bill, overrides: object = {}) => ({
  dueDate: bill.nextDueDate,
  updatedAt: bill.updatedAt,
  date: "2026-02-01",
  amount: bill.amount,
  ...overrides,
});

describe("bills", () => {
  it("creates and lists only the user's bills in due-date order", async () => {
    const later = await create({ name: "Rent", nextDueDate: "2026-03-01" });
    const earlier = await create();
    expect(earlier).toMatchObject({
      name: "Internet",
      amount: "42.50",
      category: { id: categoryId, type: "expense" },
      frequency: "monthly",
      lastPaidDate: null,
    });
    const response = await agent.get("/api/v1/bills");
    expect(response.status).toBe(200);
    expect(response.body.data.map((bill: Bill) => bill.id)).toEqual([earlier.id, later.id]);
    const other = newAgent();
    await signUp(other, { ...testUser, email: "other@example.com" });
    expect((await other.get("/api/v1/bills")).body.data).toEqual([]);
  });

  it("updates a bill and preserves the anchor when only the amount changes", async () => {
    const bill = await create();
    const paid = await agent.post(`/api/v1/bills/${bill.id}/payments`).send(payment(bill));
    expect(paid.status).toBe(201);
    const next = paid.body.bill as Bill;
    const updated = await agent
      .put(`/api/v1/bills/${bill.id}`)
      .send({ ...valid, categoryId, amount: "55", nextDueDate: next.nextDueDate, updatedAt: next.updatedAt });
    expect(updated.status).toBe(200);
    expect(updated.body.amount).toBe("55.00");
    const again = await agent.post(`/api/v1/bills/${bill.id}/payments`).send(payment(updated.body));
    expect(again.status).toBe(201);
    expect(again.body.bill.nextDueDate).toBe("2026-03-31");
  });

  it("starts a new anchor when the user changes the schedule", async () => {
    const bill = await create();
    const updated = await agent
      .put(`/api/v1/bills/${bill.id}`)
      .send({ ...valid, categoryId, nextDueDate: "2026-02-15", updatedAt: bill.updatedAt });
    expect(updated.status).toBe(200);
    const response = await agent.post(`/api/v1/bills/${bill.id}/payments`).send(payment(updated.body));
    expect(response.body.bill.nextDueDate).toBe("2026-03-15");
  });

  it("records the actual amount and payment date and updates monthly budgets and summary", async () => {
    const bill = await create();
    const user = await prisma.user.findUniqueOrThrow({ where: { email: testUser.email } });
    await agent.put("/api/v1/budgets").send({ budgets: [{ categoryId, amount: "100" }] });
    const response = await agent
      .post(`/api/v1/bills/${bill.id}/payments`)
      .send(payment(bill, { amount: "40.10", date: "2026-02-03" }));
    expect(response.status).toBe(201);
    expect(response.body.bill).toMatchObject({
      nextDueDate: "2026-02-28",
      lastPaidDate: "2026-02-03",
      amount: "42.50",
    });
    const transaction = await prisma.transaction.findUniqueOrThrow({
      where: { id: response.body.transactionId },
    });
    expect(transaction).toMatchObject({
      userId: user.id,
      categoryId,
      type: "EXPENSE",
      note: "Bill: Internet (due 2026-01-31)",
    });
    expect(transaction.amount.toFixed(2)).toBe("40.10");
    expect(transaction.date.toISOString()).toBe("2026-02-03T00:00:00.000Z");
    expect((await agent.get("/api/v1/transactions/summary?month=2026-02")).body.totalExpense).toBe("40.10");
    expect((await agent.get("/api/v1/budgets?month=2026-02")).body.totalSpent).toBe("40.10");
  });

  it("records an occurrence exactly once under concurrent requests and rejects retries", async () => {
    const bill = await create();
    const responses = await Promise.all([
      agent.post(`/api/v1/bills/${bill.id}/payments`).send(payment(bill)),
      agent.post(`/api/v1/bills/${bill.id}/payments`).send(payment(bill)),
    ]);
    expect(responses.map((response) => response.status).sort()).toEqual([201, 409]);
    expect(await prisma.transaction.count()).toBe(1);
    const retry = await agent.post(`/api/v1/bills/${bill.id}/payments`).send(payment(bill));
    expect(retry.status).toBe(409);
    expect(retry.body.error.code).toBe("BILL_CHANGED");
  });

  it("rejects stale edits after payment without resetting the next occurrence", async () => {
    const bill = await create();
    await agent.post(`/api/v1/bills/${bill.id}/payments`).send(payment(bill));
    const stale = await agent
      .put(`/api/v1/bills/${bill.id}`)
      .send({ ...valid, categoryId, updatedAt: bill.updatedAt });
    expect(stale.status).toBe(409);
    expect((await agent.get("/api/v1/bills")).body.data[0].nextDueDate).toBe("2026-02-28");
  });

  it("rolls back the schedule advance if creating the expense fails", async () => {
    const bill = await create();
    const row = await repository.findBill(
      (await prisma.user.findUniqueOrThrow({ where: { email: testUser.email } })).id,
      bill.id,
    );
    expect(row).not.toBeNull();
    await expect(
      repository.payBill(row!, new Date("2026-02-01"), "0", new Date("2026-02-28")),
    ).rejects.toThrow();
    const kept = await prisma.bill.findUniqueOrThrow({ where: { id: bill.id } });
    expect(kept.nextDueDate.toISOString().slice(0, 10)).toBe(bill.nextDueDate);
    expect(kept.lastPaidDate).toBeNull();
    expect(await prisma.transaction.count()).toBe(0);
  });

  it("deletes reminders while preserving recorded transactions", async () => {
    const bill = await create();
    await agent.post(`/api/v1/bills/${bill.id}/payments`).send(payment(bill));
    expect((await agent.delete(`/api/v1/bills/${bill.id}`)).status).toBe(204);
    expect(await prisma.bill.count()).toBe(0);
    expect(await prisma.transaction.count()).toBe(1);
  });

  it("requires an owned expense category and protects categories used by bills", async () => {
    const salary = await prisma.category.findFirstOrThrow({
      where: { user: { email: testUser.email }, name: "Salary" },
    });
    const wrong = await agent.post("/api/v1/bills").send({ ...valid, categoryId: salary.id });
    expect(wrong.status).toBe(400);
    expect(wrong.body.error.code).toBe("CATEGORY_TYPE_MISMATCH");
    await create();
    expect((await agent.delete(`/api/v1/categories/${categoryId}`)).body.error.code).toBe("CATEGORY_IN_USE");
    const user = await prisma.user.findUniqueOrThrow({ where: { email: testUser.email } });
    await expect(
      prisma.bill.create({
        data: {
          userId: user.id,
          categoryId: salary.id,
          name: "Invalid",
          amount: "10",
          frequency: "MONTHLY",
          recurrenceAnchor: new Date("2026-01-01"),
          nextDueDate: new Date("2026-01-01"),
        },
      }),
    ).rejects.toThrow();
  });

  it("hides other users' bills and categories from all mutations", async () => {
    const bill = await create();
    const other = newAgent();
    await signUp(other, { ...testUser, email: "other@example.com" });
    expect(
      (await other.put(`/api/v1/bills/${bill.id}`).send({ ...valid, categoryId, updatedAt: bill.updatedAt }))
        .status,
    ).toBe(404);
    expect((await other.delete(`/api/v1/bills/${bill.id}`)).status).toBe(404);
    expect((await other.post(`/api/v1/bills/${bill.id}/payments`).send(payment(bill))).status).toBe(404);
    expect((await other.post("/api/v1/bills").send({ ...valid, categoryId })).status).toBe(404);
    expect(await prisma.transaction.count()).toBe(0);
  });

  it("validates bill and payment inputs and requires authentication", async () => {
    for (const overrides of [
      { amount: "0" },
      { amount: "-1" },
      { nextDueDate: "2026-02-30" },
      { frequency: "daily" },
      { name: " " },
      { name: "a".repeat(101) },
    ]) {
      expect((await agent.post("/api/v1/bills").send({ ...valid, categoryId, ...overrides })).status).toBe(
        400,
      );
    }
    const bill = await create();
    expect(
      (await agent.post(`/api/v1/bills/${bill.id}/payments`).send(payment(bill, { amount: "0" }))).status,
    ).toBe(400);
    expect(
      (await agent.post(`/api/v1/bills/${bill.id}/payments`).send(payment(bill, { date: "wrong" }))).status,
    ).toBe(400);
    expect((await newAgent().get("/api/v1/bills")).status).toBe(401);
    expect(
      (
        await newAgent()
          .post("/api/v1/bills")
          .send({ ...valid, categoryId })
      ).status,
    ).toBe(401);
    expect((await newAgent().post(`/api/v1/bills/${bill.id}/payments`).send(payment(bill))).status).toBe(401);
  });
});
