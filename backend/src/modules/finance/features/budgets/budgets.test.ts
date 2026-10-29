import { currentMonthIn } from "@keepitbalance/shared/dates";
import type { MonthlyBudgets } from "@keepitbalance/shared/finance";
import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../../../../shared/db.ts";
import { newAgent, signUp, testUser, type Agent } from "../../../../test/http.ts";

const otherUser = { ...testUser, name: "Other", email: "other@example.com" };

let agent: Agent;

function categoryOf(email: string, type: "INCOME" | "EXPENSE", name: string) {
  return prisma.category.findFirstOrThrow({ where: { user: { email }, type, name } });
}

async function spend(owner: Agent, categoryId: string, amount: string, date: string) {
  const response = await owner
    .post("/api/v1/transactions")
    .send({ type: "expense", amount, date, categoryId });
  expect(response.status).toBe(201);
}

async function saveBudgets(owner: Agent, budgets: { categoryId: string; amount: string }[]) {
  return owner.put("/api/v1/budgets").send({ budgets });
}

beforeEach(async () => {
  agent = newAgent();
  await signUp(agent);
});

describe("GET /api/v1/budgets", () => {
  it("returns an empty set for a new user, which means the setup screen should show", async () => {
    const response = await agent.get("/api/v1/budgets");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      month: currentMonthIn(testUser.timezone),
      totalBudget: "0.00",
      totalSpent: "0.00",
      data: [],
    });
  });

  it("reports each budget's spending for the chosen month, sorted by category name", async () => {
    const groceries = await categoryOf(testUser.email, "EXPENSE", "Groceries");
    const eatingOut = await categoryOf(testUser.email, "EXPENSE", "Eating out");
    const transport = await categoryOf(testUser.email, "EXPENSE", "Transport");
    await saveBudgets(agent, [
      { categoryId: groceries.id, amount: "420" },
      { categoryId: eatingOut.id, amount: "100" },
    ]);
    await spend(agent, groceries.id, "389.80", "2026-09-03");
    await spend(agent, eatingOut.id, "60", "2026-09-10");
    await spend(agent, eatingOut.id, "52.5", "2026-09-30");
    await spend(agent, eatingOut.id, "999", "2026-10-01");
    await spend(agent, transport.id, "45", "2026-09-12");

    const response = await agent.get("/api/v1/budgets?month=2026-09");
    const body = response.body as MonthlyBudgets;

    expect(body).toMatchObject({ month: "2026-09", totalBudget: "520.00", totalSpent: "502.30" });
    expect(body.data).toEqual([
      {
        id: expect.any(String),
        category: { id: eatingOut.id, name: "Eating out", type: "expense" },
        amount: "100.00",
        spent: "112.50",
        remaining: "-12.50",
      },
      {
        id: expect.any(String),
        category: { id: groceries.id, name: "Groceries", type: "expense" },
        amount: "420.00",
        spent: "389.80",
        remaining: "30.20",
      },
    ]);
  });

  it("never shows another user's budgets", async () => {
    const otherAgent = newAgent();
    await signUp(otherAgent, otherUser);
    const theirGroceries = await categoryOf(otherUser.email, "EXPENSE", "Groceries");
    await saveBudgets(otherAgent, [{ categoryId: theirGroceries.id, amount: "50" }]);

    const response = await agent.get("/api/v1/budgets");

    expect(response.body.data).toEqual([]);
  });

  it("validates the month and requires a session", async () => {
    expect((await agent.get("/api/v1/budgets?month=2026-13")).status).toBe(400);
    expect((await newAgent().get("/api/v1/budgets")).status).toBe(401);
  });
});

describe("PUT /api/v1/budgets", () => {
  it("saves amounts as entered and returns this month's budgets", async () => {
    const groceries = await categoryOf(testUser.email, "EXPENSE", "Groceries");

    const response = await saveBudgets(agent, [{ categoryId: groceries.id, amount: "412.3" }]);

    expect(response.status).toBe(200);
    expect(response.body.month).toBe(currentMonthIn(testUser.timezone));
    expect(response.body.data).toEqual([expect.objectContaining({ amount: "412.30", spent: "0.00" })]);
  });

  it("replaces the whole set: updates kept categories and removes left-out ones", async () => {
    const groceries = await categoryOf(testUser.email, "EXPENSE", "Groceries");
    const transport = await categoryOf(testUser.email, "EXPENSE", "Transport");
    const first = await saveBudgets(agent, [
      { categoryId: groceries.id, amount: "400" },
      { categoryId: transport.id, amount: "80" },
    ]);
    const groceriesBudgetId = (first.body as MonthlyBudgets).data.find(
      (budget) => budget.category.id === groceries.id,
    )?.id;

    const second = await saveBudgets(agent, [{ categoryId: groceries.id, amount: "450" }]);

    expect((second.body as MonthlyBudgets).data).toEqual([
      expect.objectContaining({ id: groceriesBudgetId, amount: "450.00" }),
    ]);
    expect(await prisma.budget.count()).toBe(1);
  });

  it("removes every budget when the list is empty", async () => {
    const groceries = await categoryOf(testUser.email, "EXPENSE", "Groceries");
    await saveBudgets(agent, [{ categoryId: groceries.id, amount: "400" }]);

    const response = await saveBudgets(agent, []);

    expect(response.body.data).toEqual([]);
    expect(await prisma.budget.count()).toBe(0);
  });

  it("rejects an income category and changes nothing", async () => {
    const groceries = await categoryOf(testUser.email, "EXPENSE", "Groceries");
    const salary = await categoryOf(testUser.email, "INCOME", "Salary");
    await saveBudgets(agent, [{ categoryId: groceries.id, amount: "400" }]);

    const response = await saveBudgets(agent, [
      { categoryId: groceries.id, amount: "999" },
      { categoryId: salary.id, amount: "100" },
    ]);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("CATEGORY_TYPE_MISMATCH");
    const [kept] = await prisma.budget.findMany();
    expect(kept?.amount.toFixed(2)).toBe("400.00");
  });

  it("treats another user's category as not found", async () => {
    const otherAgent = newAgent();
    await signUp(otherAgent, otherUser);
    const theirs = await categoryOf(otherUser.email, "EXPENSE", "Groceries");

    const response = await saveBudgets(agent, [{ categoryId: theirs.id, amount: "100" }]);

    expect(response.status).toBe(404);
    expect(await prisma.budget.count()).toBe(0);
  });

  it("rejects the same category twice and invalid amounts", async () => {
    const groceries = await categoryOf(testUser.email, "EXPENSE", "Groceries");

    const duplicate = await saveBudgets(agent, [
      { categoryId: groceries.id, amount: "100" },
      { categoryId: groceries.id, amount: "200" },
    ]);
    const zero = await saveBudgets(agent, [{ categoryId: groceries.id, amount: "0" }]);

    expect(duplicate.status).toBe(400);
    expect(zero.status).toBe(400);
    expect(zero.body.error.details).toEqual([expect.objectContaining({ path: "budgets.0.amount" })]);
  });

  it("requires a session", async () => {
    expect((await newAgent().put("/api/v1/budgets").send({ budgets: [] })).status).toBe(401);
  });
});

describe("budget database rules", () => {
  it("only allows expense categories, even when writing to the database directly", async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { email: testUser.email } });
    const salary = await categoryOf(testUser.email, "INCOME", "Salary");

    await expect(
      prisma.budget.create({ data: { userId: user.id, categoryId: salary.id, amount: "10" } }),
    ).rejects.toThrow();
    await expect(
      prisma.budget.create({
        data: { userId: user.id, categoryId: salary.id, type: "INCOME", amount: "10" },
      }),
    ).rejects.toThrow(/budgets_type_check/);
  });

  it("blocks deleting a category that has a budget", async () => {
    const groceries = await categoryOf(testUser.email, "EXPENSE", "Groceries");
    await saveBudgets(agent, [{ categoryId: groceries.id, amount: "100" }]);

    await expect(prisma.category.delete({ where: { id: groceries.id } })).rejects.toThrow();
  });
});
