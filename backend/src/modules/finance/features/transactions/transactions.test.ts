import { currentMonthIn } from "@keepitbalance/shared/dates";
import type { Transaction } from "@keepitbalance/shared/finance";
import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../../../../shared/db.ts";
import { newAgent, signUp, testUser, type Agent } from "../../../../test/http.ts";

const otherUser = { ...testUser, name: "Other", email: "other@example.com" };

let agent: Agent;

async function categoryOf(email: string, type: "INCOME" | "EXPENSE", name: string) {
  return prisma.category.findFirstOrThrow({ where: { user: { email }, type, name } });
}

async function validBody() {
  const groceries = await categoryOf(testUser.email, "EXPENSE", "Groceries");
  return {
    type: "expense",
    amount: "42.5",
    date: "2026-09-27",
    categoryId: groceries.id,
    note: "Weekly shop",
  };
}

beforeEach(async () => {
  agent = newAgent();
  await signUp(agent);
});

describe("POST /api/v1/transactions", () => {
  it("creates the transaction and returns it in the API format", async () => {
    const body = await validBody();

    const response = await agent.post("/api/v1/transactions").send(body);

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      id: expect.any(String),
      type: "expense",
      amount: "42.50",
      date: "2026-09-27",
      note: "Weekly shop",
      category: { id: body.categoryId, name: "Groceries", type: "expense" },
      shoppingListId: null,
      createdAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      updatedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
    });
  });

  it("stores the calendar day exactly as sent", async () => {
    const response = await agent.post("/api/v1/transactions").send(await validBody());

    const [row] = await prisma.$queryRaw<{ date: string }[]>`
      SELECT date::text AS date FROM transactions WHERE id = ${response.body.id}::uuid`;
    expect(row?.date).toBe("2026-09-27");
  });

  it("requires a session", async () => {
    const response = await newAgent()
      .post("/api/v1/transactions")
      .send(await validBody());

    expect(response.status).toBe(401);
  });

  it("rejects an invalid body with validation details", async () => {
    const response = await agent
      .post("/api/v1/transactions")
      .send({ ...(await validBody()), amount: "0", date: "2026-02-30" });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(response.body.error.details.map((issue: { path: string }) => issue.path)).toEqual(
      expect.arrayContaining(["amount", "date"]),
    );
  });

  it("treats another user's category as not found", async () => {
    await signUp(newAgent(), otherUser);
    const theirs = await categoryOf(otherUser.email, "EXPENSE", "Groceries");

    const response = await agent
      .post("/api/v1/transactions")
      .send({ ...(await validBody()), categoryId: theirs.id });

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("NOT_FOUND");
    expect(await prisma.transaction.count()).toBe(0);
  });

  it("rejects a category whose type doesn't match", async () => {
    const salary = await categoryOf(testUser.email, "INCOME", "Salary");

    const response = await agent
      .post("/api/v1/transactions")
      .send({ ...(await validBody()), categoryId: salary.id });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("CATEGORY_TYPE_MISMATCH");
    expect(await prisma.transaction.count()).toBe(0);
  });

  it("always assigns the transaction to the logged-in user, ignoring userId in the body", async () => {
    await signUp(newAgent(), otherUser);
    const other = await prisma.user.findUniqueOrThrow({ where: { email: otherUser.email } });

    const response = await agent
      .post("/api/v1/transactions")
      .send({ ...(await validBody()), userId: other.id });

    expect(response.status).toBe(201);
    const row = await prisma.transaction.findUniqueOrThrow({
      where: { id: response.body.id },
      include: { user: true },
    });
    expect(row.user.email).toBe(testUser.email);
  });

  it("stores a blank note as no note", async () => {
    const response = await agent.post("/api/v1/transactions").send({ ...(await validBody()), note: "   " });

    expect(response.body.note).toBeNull();
    expect((await prisma.transaction.findUniqueOrThrow({ where: { id: response.body.id } })).note).toBeNull();
  });
});

type NewTransaction = { date: string; type?: "income" | "expense"; amount?: string };

async function addTransaction(
  owner: Agent,
  { date, type = "expense", amount = "10" }: NewTransaction,
  email = testUser.email,
): Promise<Transaction> {
  const category =
    type === "income"
      ? await categoryOf(email, "INCOME", "Salary")
      : await categoryOf(email, "EXPENSE", "Groceries");
  const response = await owner
    .post("/api/v1/transactions")
    .send({ type, amount, date, categoryId: category.id });
  expect(response.status).toBe(201);
  return response.body as Transaction;
}

const datesOf = (transactions: Transaction[]) => transactions.map((transaction) => transaction.date);

describe("GET /api/v1/transactions", () => {
  it("requires a session", async () => {
    expect((await newAgent().get("/api/v1/transactions")).status).toBe(401);
  });

  it("defaults to the current month in the user's timezone, newest first, with page info", async () => {
    const thisMonth = currentMonthIn(testUser.timezone);
    const first = await addTransaction(agent, { date: `${thisMonth}-01` });
    const second = await addTransaction(agent, { date: `${thisMonth}-02` });
    const third = await addTransaction(agent, { date: `${thisMonth}-02` });

    const response = await agent.get("/api/v1/transactions");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      data: [third, second, first],
      page: 1,
      pageSize: 20,
      total: 3,
      totalPages: 1,
    });
  });

  it("includes the whole month and nothing outside it", async () => {
    for (const date of ["2026-08-31", "2026-09-01", "2026-09-30", "2026-10-01"]) {
      await addTransaction(agent, { date });
    }

    const response = await agent.get("/api/v1/transactions?month=2026-09");

    expect(datesOf(response.body.data)).toEqual(["2026-09-30", "2026-09-01"]);
  });

  it("filters by type", async () => {
    await addTransaction(agent, { date: "2026-09-10", type: "expense" });
    const salary = await addTransaction(agent, { date: "2026-09-11", type: "income" });

    const response = await agent.get("/api/v1/transactions?month=2026-09&type=income");

    expect(response.body.data).toEqual([salary]);
    expect(response.body.total).toBe(1);
  });

  it("never includes another user's transactions", async () => {
    const otherAgent = newAgent();
    await signUp(otherAgent, otherUser);
    await addTransaction(otherAgent, { date: "2026-09-10" }, otherUser.email);
    const mine = await addTransaction(agent, { date: "2026-09-12" });

    const response = await agent.get("/api/v1/transactions?month=2026-09");

    expect(response.body.data).toEqual([mine]);
  });

  it("paginates, counting the total with the same filters", async () => {
    for (const day of ["01", "02", "03"]) await addTransaction(agent, { date: `2026-09-${day}` });
    await addTransaction(agent, { date: "2026-09-04", type: "income" });

    const firstPage = await agent.get("/api/v1/transactions?month=2026-09&type=expense&pageSize=2");
    const secondPage = await agent.get("/api/v1/transactions?month=2026-09&type=expense&pageSize=2&page=2");

    expect(datesOf(firstPage.body.data)).toEqual(["2026-09-03", "2026-09-02"]);
    expect(firstPage.body).toMatchObject({ page: 1, pageSize: 2, total: 3, totalPages: 2 });
    expect(datesOf(secondPage.body.data)).toEqual(["2026-09-01"]);
  });

  it("rejects an invalid query with details for each field", async () => {
    const response = await agent.get("/api/v1/transactions?month=2026-13&type=savings&pageSize=500");

    expect(response.status).toBe(400);
    expect(response.body.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ location: "query", path: "month" }),
        expect.objectContaining({ location: "query", path: "type" }),
        expect.objectContaining({ location: "query", path: "pageSize" }),
      ]),
    );
  });
});

async function addShoppingTransaction(): Promise<{ id: string; categoryId: string }> {
  const user = await prisma.user.findUniqueOrThrow({ where: { email: testUser.email } });
  const groceries = await categoryOf(testUser.email, "EXPENSE", "Groceries");
  const shoppingList = await prisma.shoppingList.create({
    data: {
      userId: user.id,
      weekStart: new Date("2026-09-21T00:00:00Z"),
      status: "COMPLETED",
      completedAt: new Date(),
    },
  });
  return prisma.transaction.create({
    data: {
      userId: user.id,
      categoryId: groceries.id,
      type: "EXPENSE",
      amount: "64.20",
      date: new Date("2026-09-27T00:00:00Z"),
      shoppingListId: shoppingList.id,
    },
    select: { id: true, categoryId: true },
  });
}

const unknownId = "123e4567-e89b-12d3-a456-426614174000";

describe("PUT /api/v1/transactions/:id", () => {
  it("replaces every field and returns the updated transaction", async () => {
    const original = await addTransaction(agent, { date: "2026-09-10", amount: "10" });
    const salary = await categoryOf(testUser.email, "INCOME", "Salary");

    const response = await agent.put(`/api/v1/transactions/${original.id}`).send({
      type: "income",
      amount: "2500",
      date: "2026-09-30",
      categoryId: salary.id,
      note: "September salary",
    });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: original.id,
      type: "income",
      amount: "2500.00",
      date: "2026-09-30",
      note: "September salary",
      category: { id: salary.id, name: "Salary", type: "income" },
      createdAt: original.createdAt,
    });
  });

  it("clears the note when it's left out, because PUT replaces the whole transaction", async () => {
    const original = await addTransaction(agent, { date: "2026-09-10" });
    await agent.put(`/api/v1/transactions/${original.id}`).send({ ...(await validBody()), note: "Keep me" });

    const { note: _note, ...withoutNote } = await validBody();
    const response = await agent.put(`/api/v1/transactions/${original.id}`).send(withoutNote);

    expect(response.body.note).toBeNull();
  });

  it("treats another user's transaction as not found and leaves it unchanged", async () => {
    const otherAgent = newAgent();
    await signUp(otherAgent, otherUser);
    const theirs = await addTransaction(otherAgent, { date: "2026-09-10", amount: "10" }, otherUser.email);

    const response = await agent.put(`/api/v1/transactions/${theirs.id}`).send(await validBody());

    expect(response.status).toBe(404);
    const row = await prisma.transaction.findUniqueOrThrow({ where: { id: theirs.id } });
    expect(row.amount.toFixed(2)).toBe("10.00");
  });

  it("returns 404 for an id that doesn't exist and 400 for one that isn't a UUID", async () => {
    expect((await agent.put(`/api/v1/transactions/${unknownId}`).send(await validBody())).status).toBe(404);

    const response = await agent.put("/api/v1/transactions/abc").send(await validBody());
    expect(response.status).toBe(400);
    expect(response.body.error.details).toEqual([
      expect.objectContaining({ location: "params", path: "id" }),
    ]);
  });

  it("rejects a category whose type doesn't match", async () => {
    const original = await addTransaction(agent, { date: "2026-09-10" });
    const salary = await categoryOf(testUser.email, "INCOME", "Salary");

    const response = await agent
      .put(`/api/v1/transactions/${original.id}`)
      .send({ ...(await validBody()), categoryId: salary.id });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("CATEGORY_TYPE_MISMATCH");
  });

  it("lets a shopping expense change its amount, date and note, but not its category", async () => {
    const shopping = await addShoppingTransaction();
    const transport = await categoryOf(testUser.email, "EXPENSE", "Transport");
    const sameCategory = { type: "expense", categoryId: shopping.categoryId };

    const edited = await agent
      .put(`/api/v1/transactions/${shopping.id}`)
      .send({ ...sameCategory, amount: "70", date: "2026-09-28", note: "Corrected total" });
    const recategorised = await agent
      .put(`/api/v1/transactions/${shopping.id}`)
      .send({ ...sameCategory, categoryId: transport.id, amount: "70", date: "2026-09-28" });

    expect(edited.status).toBe(200);
    expect(edited.body).toMatchObject({ amount: "70.00", date: "2026-09-28", note: "Corrected total" });
    expect(recategorised.status).toBe(409);
    expect(recategorised.body.error.code).toBe("TRANSACTION_FROM_SHOPPING");
  });

  it("requires a session", async () => {
    const original = await addTransaction(agent, { date: "2026-09-10" });

    const response = await newAgent()
      .put(`/api/v1/transactions/${original.id}`)
      .send(await validBody());

    expect(response.status).toBe(401);
  });
});

describe("DELETE /api/v1/transactions/:id", () => {
  it("deletes the transaction and returns no content", async () => {
    const original = await addTransaction(agent, { date: "2026-09-10" });

    const response = await agent.delete(`/api/v1/transactions/${original.id}`);

    expect(response.status).toBe(204);
    expect(response.text).toBe("");
    expect(await prisma.transaction.count()).toBe(0);
  });

  it("treats another user's transaction as not found and keeps it", async () => {
    const otherAgent = newAgent();
    await signUp(otherAgent, otherUser);
    const theirs = await addTransaction(otherAgent, { date: "2026-09-10" }, otherUser.email);

    const response = await agent.delete(`/api/v1/transactions/${theirs.id}`);

    expect(response.status).toBe(404);
    expect(await prisma.transaction.count()).toBe(1);
  });

  it("returns 404 for an unknown id and 400 for a malformed one", async () => {
    expect((await agent.delete(`/api/v1/transactions/${unknownId}`)).status).toBe(404);
    expect((await agent.delete("/api/v1/transactions/abc")).status).toBe(400);
  });

  it("refuses to delete a shopping expense", async () => {
    const shopping = await addShoppingTransaction();

    const response = await agent.delete(`/api/v1/transactions/${shopping.id}`);

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("TRANSACTION_FROM_SHOPPING");
    expect(await prisma.transaction.count()).toBe(1);
  });

  it("requires a session", async () => {
    const original = await addTransaction(agent, { date: "2026-09-10" });

    expect((await newAgent().delete(`/api/v1/transactions/${original.id}`)).status).toBe(401);
  });
});
