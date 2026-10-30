import { prisma } from "../../../../shared/db.ts";
import { beforeEach, describe, expect, it } from "vitest";
import { newAgent, signUp, testUser, type Agent } from "../../../../test/http.ts";

let agent: Agent;

beforeEach(async () => {
  agent = newAgent();
  await signUp(agent);
});

describe("GET /api/v1/categories", () => {
  it("lists the user's categories grouped by type, then sorted by name", async () => {
    const response = await agent.get("/api/v1/categories");

    expect(response.status).toBe(200);
    expect(
      response.body.data.map(({ type, name }: { type: string; name: string }) => `${type}:${name}`),
    ).toEqual([
      "income:Other",
      "income:Salary",
      "expense:Bills",
      "expense:Eating out",
      "expense:Groceries",
      "expense:Housing",
      "expense:Other",
      "expense:Transport",
    ]);
    expect(response.body.data[0]).toEqual({
      id: expect.any(String),
      name: "Other",
      type: "income",
      groupId: expect.any(String),
    });
  });

  it("filters by type", async () => {
    const response = await agent.get("/api/v1/categories?type=income");

    expect(response.body.data.map(({ name }: { name: string }) => name)).toEqual(["Other", "Salary"]);
  });

  it("rejects an unknown type", async () => {
    const response = await agent.get("/api/v1/categories?type=savings");

    expect(response.status).toBe(400);
    expect(response.body.error.details[0]).toMatchObject({ location: "query", path: "type" });
  });

  it("never includes another user's categories", async () => {
    await signUp(newAgent(), { ...testUser, email: "other@example.com" });

    const response = await agent.get("/api/v1/categories");

    expect(response.body.data).toHaveLength(8);
  });

  it("requires a session", async () => {
    expect((await newAgent().get("/api/v1/categories")).status).toBe(401);
  });
});

describe("category and group management", () => {
  it("creates the default hierarchy and supports type filtering", async () => {
    const response = await agent.get("/api/v1/category-groups?type=expense");
    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject([
      {
        name: "Essentials",
        type: "expense",
        categories: [{ name: "Bills" }, { name: "Groceries" }, { name: "Housing" }, { name: "Transport" }],
      },
      { name: "Lifestyle", type: "expense", categories: [{ name: "Eating out" }, { name: "Other" }] },
    ]);
    for (const group of response.body.data) {
      expect(group.categories.every((category: { groupId: string }) => category.groupId === group.id)).toBe(
        true,
      );
    }
    expect((await newAgent().get("/api/v1/category-groups")).status).toBe(401);
  });

  it("creates, renames, moves and deletes categories and empty groups", async () => {
    const group = await agent.post("/api/v1/category-groups").send({ name: " Travel ", type: "expense" });
    expect(group.status).toBe(201);
    expect(group.body.name).toBe("Travel");
    const category = await agent
      .post("/api/v1/categories")
      .send({ name: " Flights ", groupId: group.body.id });
    expect(category.status).toBe(201);
    expect(category.body).toMatchObject({ name: "Flights", groupId: group.body.id, type: "expense" });
    const renamed = await agent.patch(`/api/v1/category-groups/${group.body.id}`).send({ name: "Holidays" });
    expect(renamed.body.name).toBe("Holidays");
    const blocked = await agent.delete(`/api/v1/category-groups/${group.body.id}`);
    expect(blocked.status).toBe(409);
    expect(blocked.body.error.code).toBe("GROUP_NOT_EMPTY");
    const groups = await agent.get("/api/v1/category-groups?type=expense");
    const destination = groups.body.data.find((entry: { name: string }) => entry.name === "Lifestyle");
    const moved = await agent
      .patch(`/api/v1/categories/${category.body.id}`)
      .send({ name: "Air travel", groupId: destination.id });
    expect(moved.status).toBe(200);
    expect(moved.body).toMatchObject({ id: category.body.id, name: "Air travel", groupId: destination.id });
    expect((await agent.delete(`/api/v1/category-groups/${group.body.id}`)).status).toBe(204);
    expect((await agent.delete(`/api/v1/categories/${category.body.id}`)).status).toBe(204);
  });

  it("preserves a category's budget and spending when moved and blocks deleting it", async () => {
    const response = await agent.get("/api/v1/category-groups?type=expense");
    const [essentials, lifestyle] = response.body.data;
    const groceries = essentials.categories.find(
      (category: { name: string }) => category.name === "Groceries",
    );
    await agent.put("/api/v1/budgets").send({ budgets: [{ categoryId: groceries.id, amount: "100.20" }] });
    await agent
      .post("/api/v1/transactions")
      .send({ type: "expense", categoryId: groceries.id, amount: "20.10", date: "2026-09-01" });
    expect(
      (await agent.patch(`/api/v1/categories/${groceries.id}`).send({ groupId: lifestyle.id })).status,
    ).toBe(200);
    const budgets = await agent.get("/api/v1/budgets?month=2026-09");
    expect(budgets.body.groups).toMatchObject([
      {
        group: { id: lifestyle.id },
        amount: "100.20",
        spent: "20.10",
        remaining: "80.10",
        budgets: [{ category: { id: groceries.id, groupId: lifestyle.id } }],
      },
    ]);
    const deleted = await agent.delete(`/api/v1/categories/${groceries.id}`);
    expect(deleted.status).toBe(409);
    expect(deleted.body.error.code).toBe("CATEGORY_IN_USE");
  });

  it("protects categories used only by a budget or only by a transaction", async () => {
    const { body } = await agent.get("/api/v1/categories?type=expense");
    const [budgeted, spent] = body.data;
    await agent.put("/api/v1/budgets").send({ budgets: [{ categoryId: budgeted.id, amount: "10" }] });
    await agent
      .post("/api/v1/transactions")
      .send({ type: "expense", categoryId: spent.id, amount: "1", date: "2026-09-01" });
    for (const category of [budgeted, spent]) {
      const response = await agent.delete(`/api/v1/categories/${category.id}`);
      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe("CATEGORY_IN_USE");
    }
  });

  it("requires a group, forbids cross-type moves and rejects duplicate names", async () => {
    const { body } = await agent.get("/api/v1/category-groups");
    const income = body.data.find((group: { type: string }) => group.type === "income");
    const expense = body.data.find((group: { type: string }) => group.type === "expense");
    expect((await agent.post("/api/v1/categories").send({ name: "Orphan" })).status).toBe(400);
    expect((await agent.post("/api/v1/categories").send({ name: "", groupId: expense.id })).status).toBe(400);
    const mismatch = await agent
      .patch(`/api/v1/categories/${expense.categories[0].id}`)
      .send({ groupId: income.id });
    expect(mismatch.status).toBe(400);
    expect(mismatch.body.error.code).toBe("CATEGORY_TYPE_MISMATCH");
    expect((await agent.patch(`/api/v1/categories/${expense.categories[0].id}`).send({})).status).toBe(400);
    const duplicate = await agent
      .post("/api/v1/category-groups")
      .send({ name: expense.name, type: expense.type });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error.code).toBe("DUPLICATE_NAME");
    const categoryDuplicate = await agent
      .post("/api/v1/categories")
      .send({ name: expense.categories[0].name, groupId: expense.id });
    expect(categoryDuplicate.status).toBe(409);
    expect(categoryDuplicate.body.error.code).toBe("DUPLICATE_NAME");
  });

  it("treats other users' resources as not found for every mutation", async () => {
    const other = newAgent();
    await signUp(other, { ...testUser, email: "other@example.com" });
    const { body } = await other.get("/api/v1/category-groups?type=expense");
    const group = body.data[0];
    const category = group.categories[0];
    expect((await agent.patch(`/api/v1/category-groups/${group.id}`).send({ name: "Stolen" })).status).toBe(
      404,
    );
    expect((await agent.delete(`/api/v1/category-groups/${group.id}`)).status).toBe(404);
    expect((await agent.post("/api/v1/categories").send({ name: "Stolen", groupId: group.id })).status).toBe(
      404,
    );
    expect((await agent.patch(`/api/v1/categories/${category.id}`).send({ name: "Stolen" })).status).toBe(
      404,
    );
    expect((await agent.delete(`/api/v1/categories/${category.id}`)).status).toBe(404);
    const mine = await agent.get("/api/v1/categories?type=expense");
    expect(
      (await agent.patch(`/api/v1/categories/${mine.body.data[0].id}`).send({ groupId: group.id })).status,
    ).toBe(404);
  });
});

it("enforces required group ownership and type in the database", async () => {
  const user = await prisma.user.findUniqueOrThrow({ where: { email: testUser.email } });
  const income = await prisma.categoryGroup.findFirstOrThrow({ where: { userId: user.id, type: "INCOME" } });
  await expect(
    prisma.category.create({
      data: { userId: user.id, type: "EXPENSE", name: "Wrong type", groupId: income.id },
    }),
  ).rejects.toThrow();
  await expect(
    prisma.$executeRaw`INSERT INTO categories (user_id, type, name, group_id) VALUES (${user.id}::uuid, 'EXPENSE', 'No group', NULL)`,
  ).rejects.toThrow();
  await signUp(newAgent(), { ...testUser, email: "other@example.com" });
  const other = await prisma.categoryGroup.findFirstOrThrow({
    where: { user: { email: "other@example.com" }, type: "EXPENSE" },
  });
  await expect(
    prisma.category.create({
      data: { userId: user.id, type: "EXPENSE", name: "Wrong owner", groupId: other.id },
    }),
  ).rejects.toThrow();
});
