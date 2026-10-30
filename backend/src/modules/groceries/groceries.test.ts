import type { MonthlyBudgets } from "@keepitbalance/shared/finance";
import type { Ingredient, PantryItem, ShoppingList } from "@keepitbalance/shared/groceries";
import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../../shared/db.ts";
import { newAgent, signUp, testUser, type Agent } from "../../test/http.ts";

let agent: Agent;
let userId: string;
let categoryId: string;

beforeEach(async () => {
  agent = newAgent();
  await signUp(agent);
  const user = await prisma.user.findUniqueOrThrow({ where: { email: testUser.email } });
  userId = user.id;
  categoryId = (
    await prisma.category.findFirstOrThrow({ where: { userId, type: "EXPENSE", name: "Groceries" } })
  ).id;
});

async function ingredient(name = "Rice", unit = "g", owner = agent): Promise<Ingredient> {
  const response = await owner.post("/api/v1/ingredients").send({ name, unit });
  expect(response.status).toBe(201);
  return response.body as Ingredient;
}
async function list(owner = agent): Promise<ShoppingList> {
  const response = await owner.post("/api/v1/shopping-lists").send({});
  expect(response.status).toBe(201);
  return response.body as ShoppingList;
}
async function item(
  listId: string,
  ingredientId: string,
  quantity = "500",
  owner = agent,
): Promise<ShoppingList> {
  const response = await owner
    .post(`/api/v1/shopping-lists/${listId}/items`)
    .send({ ingredientId, quantity });
  expect(response.status).toBe(201);
  return response.body as ShoppingList;
}
async function check(current: ShoppingList, itemId = current.items[0]!.id): Promise<ShoppingList> {
  const response = await agent
    .patch(`/api/v1/shopping-lists/${current.id}/items/${itemId}`)
    .send({ checked: true });
  expect(response.status).toBe(200);
  return response.body as ShoppingList;
}
const checkout = (current: ShoppingList, overrides: object = {}) => ({
  amount: "42.50",
  date: "2026-10-30",
  categoryId,
  updatedAt: current.updatedAt,
  ...overrides,
});
async function otherAgent() {
  const other = newAgent();
  await signUp(other, { email: "other@example.com" });
  return other;
}

describe("ingredients", () => {
  it("creates normalized names, lists alphabetically and rejects case-insensitive duplicates", async () => {
    const rice = await ingredient(" Rice ");
    await ingredient("Eggs", "pcs");
    expect(rice).toMatchObject({ name: "Rice", unit: "g", inUse: false });
    const response = await agent.get("/api/v1/ingredients");
    expect(response.body.data.map((row: Ingredient) => row.name)).toEqual(["Eggs", "Rice"]);
    const duplicate = await agent.post("/api/v1/ingredients").send({ name: "rice", unit: "g" });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error.code).toBe("DUPLICATE_NAME");
  });
  it("allows renaming used ingredients but protects their unit and deletion", async () => {
    const rice = await ingredient();
    const pantry = await agent.post("/api/v1/pantry").send({ ingredientId: rice.id, quantity: "100" });
    expect(pantry.status).toBe(201);
    expect(
      (await agent.put(`/api/v1/ingredients/${rice.id}`).send({ name: "Brown rice", unit: "g" })).status,
    ).toBe(200);
    expect((await agent.get("/api/v1/pantry")).body.data[0].ingredient.name).toBe("Brown rice");
    const wrongUnit = await agent
      .put(`/api/v1/ingredients/${rice.id}`)
      .send({ name: "Brown rice", unit: "ml" });
    expect(wrongUnit.status).toBe(409);
    expect(wrongUnit.body.error.code).toBe("INGREDIENT_UNIT_IN_USE");
    expect((await agent.delete(`/api/v1/ingredients/${rice.id}`)).status).toBe(409);
    await agent.delete(`/api/v1/pantry/${pantry.body.id}`);
    expect(
      (await agent.put(`/api/v1/ingredients/${rice.id}`).send({ name: "Rice", unit: "pcs" })).status,
    ).toBe(200);
    expect((await agent.delete(`/api/v1/ingredients/${rice.id}`)).status).toBe(204);
  });
  it("validates input and scopes every mutation to the owner", async () => {
    const rice = await ingredient();
    const other = await otherAgent();
    expect((await other.get("/api/v1/ingredients")).body.data).toEqual([]);
    expect(
      (await other.put(`/api/v1/ingredients/${rice.id}`).send({ name: "Stolen", unit: "g" })).status,
    ).toBe(404);
    expect((await other.delete(`/api/v1/ingredients/${rice.id}`)).status).toBe(404);
    for (const values of [
      { name: " ", unit: "g" },
      { name: "Eggs", unit: "unknown" },
    ])
      expect((await agent.post("/api/v1/ingredients").send(values)).status).toBe(400);
    expect((await newAgent().get("/api/v1/ingredients")).status).toBe(401);
  });
});

describe("pantry", () => {
  it("supports zero stock, exact adjustments, edits and removal", async () => {
    const rice = await ingredient();
    const created = await agent.post("/api/v1/pantry").send({ ingredientId: rice.id, quantity: "0" });
    expect(created.status).toBe(201);
    expect(created.body.quantity).toBe("0.00");
    expect((await agent.post("/api/v1/pantry").send({ ingredientId: rice.id, quantity: "10" })).status).toBe(
      409,
    );
    const id = created.body.id as string;
    await agent.post(`/api/v1/pantry/${id}/adjustments`).send({ direction: "add", quantity: "0.1" });
    const added = await agent
      .post(`/api/v1/pantry/${id}/adjustments`)
      .send({ direction: "add", quantity: "0.2" });
    expect(added.body.quantity).toBe("0.30");
    const used = await agent
      .post(`/api/v1/pantry/${id}/adjustments`)
      .send({ direction: "remove", quantity: "0.1" });
    expect(used.body.quantity).toBe("0.20");
    expect(
      (await agent.put(`/api/v1/pantry/${id}`).send({ quantity: "50", updatedAt: used.body.updatedAt })).body
        .quantity,
    ).toBe("50.00");
    expect(
      (await agent.put(`/api/v1/pantry/${id}`).send({ quantity: "999", updatedAt: created.body.updatedAt }))
        .status,
    ).toBe(409);
    expect((await agent.delete(`/api/v1/pantry/${id}`)).status).toBe(204);
  });
  it("prevents concurrent adjustments from making stock negative", async () => {
    const rice = await ingredient();
    const created = await agent.post("/api/v1/pantry").send({ ingredientId: rice.id, quantity: "10" });
    const results = await Promise.all(
      [1, 2].map(() =>
        agent
          .post(`/api/v1/pantry/${created.body.id}/adjustments`)
          .send({ direction: "remove", quantity: "6" }),
      ),
    );
    expect(results.map((response) => response.status).sort()).toEqual([200, 409]);
    expect((await agent.get("/api/v1/pantry")).body.data[0].quantity).toBe("4.00");
  });
  it("rejects foreign ingredients and pantry entries and invalid quantities", async () => {
    const rice = await ingredient();
    const created = await agent.post("/api/v1/pantry").send({ ingredientId: rice.id, quantity: "10" });
    const other = await otherAgent();
    expect((await other.post("/api/v1/pantry").send({ ingredientId: rice.id, quantity: "1" })).status).toBe(
      404,
    );
    expect((await other.get("/api/v1/pantry")).body.data).toEqual([]);
    expect(
      (
        await other
          .put(`/api/v1/pantry/${created.body.id}`)
          .send({ quantity: "1", updatedAt: created.body.updatedAt })
      ).status,
    ).toBe(404);
    expect(
      (
        await other
          .post(`/api/v1/pantry/${created.body.id}/adjustments`)
          .send({ direction: "remove", quantity: "1" })
      ).status,
    ).toBe(404);
    expect((await other.delete(`/api/v1/pantry/${created.body.id}`)).status).toBe(404);
    for (const quantity of ["-1", "1.234", "100000000", "abc"])
      expect((await agent.post("/api/v1/pantry").send({ ingredientId: rice.id, quantity })).status).toBe(400);
    expect((await newAgent().get("/api/v1/pantry")).status).toBe(401);
  });
});

describe("shopping lists", () => {
  it("has one open list even with simultaneous creation", async () => {
    expect((await agent.get("/api/v1/shopping-lists/current")).body).toEqual({
      data: null,
      defaultCategoryId: categoryId,
    });
    const results = await Promise.all([1, 2].map(() => agent.post("/api/v1/shopping-lists").send({})));
    expect(results.map((response) => response.status).sort()).toEqual([201, 409]);
    expect(await prisma.shoppingList.count()).toBe(1);
  });
  it("combines duplicate ingredients, edits quantities, checks items and deletes open lists", async () => {
    const rice = await ingredient();
    let current = await list();
    current = await item(current.id, rice.id, "0.1");
    current = await item(current.id, rice.id, "0.2");
    expect(current.items).toHaveLength(1);
    expect(current.items[0]!.quantity).toBe("0.30");
    const edited = await agent
      .patch(`/api/v1/shopping-lists/${current.id}/items/${current.items[0]!.id}`)
      .send({ quantity: "20", checked: true });
    expect(edited.body.items[0]).toMatchObject({ quantity: "20.00", checked: true });
    const combined = await item(current.id, rice.id, "1");
    expect(combined.items[0]).toMatchObject({ quantity: "21.00", checked: false });
    await check(combined);
    const resized = await agent
      .patch(`/api/v1/shopping-lists/${current.id}/items/${current.items[0]!.id}`)
      .send({ quantity: "25" });
    expect(resized.body.items[0]).toMatchObject({ quantity: "25.00", checked: false });
    expect(
      (await agent.delete(`/api/v1/shopping-lists/${current.id}/items/${current.items[0]!.id}`)).body.items,
    ).toEqual([]);
    expect((await agent.delete(`/api/v1/shopping-lists/${current.id}`)).status).toBe(204);
  });
  it("atomically completes purchased items, records the expense and updates budgets", async () => {
    const rice = await ingredient();
    const milk = await ingredient("Milk", "ml");
    await agent.post("/api/v1/pantry").send({ ingredientId: rice.id, quantity: "100" });
    await agent.put("/api/v1/budgets").send({ budgets: [{ categoryId, amount: "100" }] });
    let current = await item((await list()).id, rice.id, "500");
    current = await item(current.id, milk.id, "1000");
    current = await check(current, current.items.find((entry) => entry.ingredient.id === rice.id)!.id);
    const completed = await agent
      .post(`/api/v1/shopping-lists/${current.id}/complete`)
      .send(checkout(current));
    expect(completed.status).toBe(200);
    expect(completed.body).toMatchObject({
      status: "completed",
      completedAt: expect.any(String),
      transaction: { amount: "42.50", date: "2026-10-30", categoryId },
    });
    expect(completed.body.items).toHaveLength(2);
    const stock = (await agent.get("/api/v1/pantry")).body.data as PantryItem[];
    expect(stock).toHaveLength(1);
    expect(stock[0]!.quantity).toBe("600.00");
    expect((await agent.get("/api/v1/shopping-lists/current")).body.data).toBeNull();
    expect((await agent.get("/api/v1/shopping-lists?status=completed")).body.data).toHaveLength(1);
    expect((await agent.get("/api/v1/budgets?month=2026-10")).body.totalSpent).toBe("42.50");
    expect((await agent.get("/api/v1/transactions/summary?month=2026-10")).body.totalExpense).toBe("42.50");
    expect((await prisma.user.findUniqueOrThrow({ where: { id: userId } })).groceryCategoryId).toBe(
      categoryId,
    );
    await agent.patch(`/api/v1/categories/${categoryId}`).send({ name: "Food spending" });
    expect((await agent.get("/api/v1/shopping-lists/current")).body.defaultCategoryId).toBe(categoryId);
    expect((await agent.delete(`/api/v1/transactions/${completed.body.transaction.id}`)).status).toBe(409);
    expect((await agent.delete(`/api/v1/shopping-lists/${current.id}`)).status).toBe(409);
    expect(
      (
        await agent
          .patch(`/api/v1/shopping-lists/${current.id}/items/${current.items[0]!.id}`)
          .send({ checked: false })
      ).status,
    ).toBe(409);
    expect((await agent.delete(`/api/v1/ingredients/${milk.id}`)).status).toBe(409);
  });
  it("only completes once under concurrent requests and never duplicates pantry or expenses", async () => {
    const rice = await ingredient();
    const current = await check(await item((await list()).id, rice.id));
    const results = await Promise.all(
      [1, 2].map(() => agent.post(`/api/v1/shopping-lists/${current.id}/complete`).send(checkout(current))),
    );
    expect(results.map((response) => response.status).sort()).toEqual([200, 409]);
    expect(await prisma.transaction.count()).toBe(1);
    expect((await prisma.pantryItem.findFirstOrThrow()).quantity.toFixed(2)).toBe("500.00");
  });
  it("rejects stale checkout and requires checked items and an expense category", async () => {
    const rice = await ingredient();
    const before = await item((await list()).id, rice.id);
    expect(
      (await agent.post(`/api/v1/shopping-lists/${before.id}/complete`).send(checkout(before))).body.error
        .code,
    ).toBe("NO_CHECKED_ITEMS");
    const current = await check(before);
    expect(
      (await agent.post(`/api/v1/shopping-lists/${current.id}/complete`).send(checkout(before))).body.error
        .code,
    ).toBe("RESOURCE_CHANGED");
    const salary = await prisma.category.findFirstOrThrow({ where: { userId, type: "INCOME" } });
    expect(
      (
        await agent
          .post(`/api/v1/shopping-lists/${current.id}/complete`)
          .send(checkout(current, { categoryId: salary.id }))
      ).body.error.code,
    ).toBe("CATEGORY_TYPE_MISMATCH");
    expect(
      (
        await agent
          .post(`/api/v1/shopping-lists/${current.id}/complete`)
          .send(checkout(current, { amount: "0" }))
      ).status,
    ).toBe(400);
    expect(await prisma.transaction.count()).toBe(0);
    expect(await prisma.pantryItem.count()).toBe(0);
    expect((await prisma.shoppingList.findFirstOrThrow()).status).toBe("OPEN");
  });
  it("rolls back expense and stock changes if an inventory increment fails", async () => {
    const rice = await ingredient();
    await agent.post("/api/v1/pantry").send({ ingredientId: rice.id, quantity: "99999999.99" });
    const current = await check(await item((await list()).id, rice.id));
    const response = await agent
      .post(`/api/v1/shopping-lists/${current.id}/complete`)
      .send(checkout(current));
    expect(response.status).toBe(400);
    expect(await prisma.transaction.count()).toBe(0);
    expect((await prisma.shoppingList.findFirstOrThrow()).status).toBe("OPEN");
    expect((await prisma.pantryItem.findFirstOrThrow()).quantity.toFixed(2)).toBe("99999999.99");
  });
  it("scopes lists, item ids, history and checkout to the owner", async () => {
    const rice = await ingredient();
    const current = await check(await item((await list()).id, rice.id));
    const other = await otherAgent();
    const otherIngredient = await ingredient("Their rice", "g", other);
    expect((await other.get("/api/v1/shopping-lists")).body.data).toEqual([]);
    expect((await other.get("/api/v1/shopping-lists/current")).body.data).toBeNull();
    expect(
      (
        await other
          .post(`/api/v1/shopping-lists/${current.id}/items`)
          .send({ ingredientId: otherIngredient.id, quantity: "1" })
      ).status,
    ).toBe(404);
    expect(
      (
        await other
          .patch(`/api/v1/shopping-lists/${current.id}/items/${current.items[0]!.id}`)
          .send({ checked: false })
      ).status,
    ).toBe(404);
    expect(
      (await other.delete(`/api/v1/shopping-lists/${current.id}/items/${current.items[0]!.id}`)).status,
    ).toBe(404);
    expect((await other.delete(`/api/v1/shopping-lists/${current.id}`)).status).toBe(404);
    expect(
      (await other.post(`/api/v1/shopping-lists/${current.id}/complete`).send(checkout(current))).status,
    ).toBe(404);
    expect(
      (
        await agent
          .post(`/api/v1/shopping-lists/${current.id}/items`)
          .send({ ingredientId: otherIngredient.id, quantity: "1" })
      ).status,
    ).toBe(404);
    expect((await newAgent().get("/api/v1/shopping-lists/current")).status).toBe(401);
  });
});

describe("batch entry", () => {
  it("creates multiple ingredients together and rejects duplicates without partial saves", async () => {
    const created = await agent.post("/api/v1/ingredients/batch").send({
      ingredients: [
        { name: " Rice ", unit: "g" },
        { name: "Milk", unit: "ml" },
      ],
    });
    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject([
      { name: "Rice", unit: "g", inUse: false },
      { name: "Milk", unit: "ml", inUse: false },
    ]);
    const duplicate = await agent.post("/api/v1/ingredients/batch").send({
      ingredients: [
        { name: "Flour", unit: "g" },
        { name: "rice", unit: "g" },
      ],
    });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error.code).toBe("DUPLICATE_NAME");
    expect(await prisma.ingredient.count()).toBe(2);
    const repeated = await agent.post("/api/v1/ingredients/batch").send({
      ingredients: [
        { name: "Eggs", unit: "pcs" },
        { name: " eggs ", unit: "pcs" },
      ],
    });
    expect(repeated.status).toBe(400);
    expect(repeated.body.error.details[0].path).toBe("ingredients.1.name");
    expect(await prisma.ingredient.count()).toBe(2);
    expect(
      (
        await newAgent()
          .post("/api/v1/ingredients/batch")
          .send({ ingredients: [{ name: "Eggs", unit: "pcs" }] })
      ).status,
    ).toBe(401);
  });
  it("rolls back concurrent ingredient batches that conflict with each other", async () => {
    const responses = await Promise.all([
      agent.post("/api/v1/ingredients/batch").send({
        ingredients: [
          { name: "First only", unit: "g" },
          { name: "Rice", unit: "g" },
        ],
      }),
      agent.post("/api/v1/ingredients/batch").send({
        ingredients: [
          { name: "Second only", unit: "g" },
          { name: "rice", unit: "g" },
        ],
      }),
    ]);
    expect(responses.map((response) => response.status).sort()).toEqual([201, 409]);
    expect(await prisma.ingredient.count()).toBe(2);
  });
  it("adds multiple shopping items, combining repeated quantities exactly", async () => {
    const rice = await ingredient();
    const milk = await ingredient("Milk", "ml");
    let current = await item((await list()).id, rice.id, "0.10");
    current = await check(current);
    const response = await agent.post(`/api/v1/shopping-lists/${current.id}/items/batch`).send({
      items: [
        { ingredientId: rice.id, quantity: "0.10" },
        { ingredientId: rice.id, quantity: "0.20" },
        { ingredientId: milk.id, quantity: "1000" },
      ],
    });
    expect(response.status).toBe(201);
    expect(response.body.items).toHaveLength(2);
    expect(
      response.body.items.find((entry: { ingredient: Ingredient }) => entry.ingredient.id === rice.id),
    ).toMatchObject({ quantity: "0.40", checked: false });
    expect(
      response.body.items.find((entry: { ingredient: Ingredient }) => entry.ingredient.id === milk.id),
    ).toMatchObject({ quantity: "1000.00" });
  });
  it("rejects a foreign ingredient or list without saving any batch rows", async () => {
    const rice = await ingredient();
    const current = await list();
    const other = await otherAgent();
    const foreign = await ingredient("Their milk", "ml", other);
    const response = await agent.post(`/api/v1/shopping-lists/${current.id}/items/batch`).send({
      items: [
        { ingredientId: rice.id, quantity: "10" },
        { ingredientId: foreign.id, quantity: "10" },
      ],
    });
    expect(response.status).toBe(404);
    expect(await prisma.shoppingListItem.count()).toBe(0);
    expect(
      (
        await other
          .post(`/api/v1/shopping-lists/${current.id}/items/batch`)
          .send({ items: [{ ingredientId: foreign.id, quantity: "10" }] })
      ).status,
    ).toBe(404);
    expect((await agent.get("/api/v1/shopping-lists/current")).body.data.updatedAt).toBe(current.updatedAt);
  });
  it("rolls back the full shopping batch if a combined quantity overflows", async () => {
    const rice = await ingredient();
    const milk = await ingredient("Milk", "ml");
    const current = await item((await list()).id, rice.id, "99999999.99");
    const response = await agent.post(`/api/v1/shopping-lists/${current.id}/items/batch`).send({
      items: [
        { ingredientId: milk.id, quantity: "1000" },
        { ingredientId: rice.id, quantity: "1" },
      ],
    });
    expect(response.status).toBe(400);
    const kept = (await agent.get("/api/v1/shopping-lists/current")).body.data as ShoppingList;
    expect(kept.items).toHaveLength(1);
    expect(kept.items[0]!.quantity).toBe("99999999.99");
    expect(kept.updatedAt).toBe(current.updatedAt);
  });
});

it("keeps shopping item positions stable when a checkbox changes", async () => {
  const rice = await ingredient();
  const eggs = await ingredient("Eggs", "pcs");
  let current = await item((await list()).id, rice.id, "100");
  current = await item(current.id, eggs.id, "6");
  const order = current.items.map((item) => item.id);
  const checked = await check(current, current.items[0]!.id);
  expect(checked.items.map((item) => item.id)).toEqual(order);
  expect(checked.items[0]!.checked).toBe(true);
});

describe("shopping item prices", () => {
  it("persists optional total prices, protects ownership and makes checkout stale after a price edit", async () => {
    const rice = await ingredient();
    let current = await check(await item((await list()).id, rice.id, "2"));
    const path = `/api/v1/shopping-lists/${current.id}/items/${current.items[0]!.id}`;
    expect(current.items[0]!.price).toBeNull();
    expect((await (await otherAgent()).patch(path).send({ price: "10" })).status).toBe(404);
    for (const price of ["-1", "0.001", "10000000000", 10])
      expect((await agent.patch(path).send({ price })).status).toBe(400);
    const before = current;
    const priced = await agent.patch(path).send({ price: "12.5" });
    expect(priced.status).toBe(200);
    current = priced.body as ShoppingList;
    expect(current.items[0]).toMatchObject({ price: "12.50", quantity: "2.00", checked: true });
    expect(
      (await agent.post(`/api/v1/shopping-lists/${current.id}/complete`).send(checkout(before))).status,
    ).toBe(409);
    const free = await agent.patch(path).send({ price: "0" });
    expect(free.body.items[0].price).toBe("0.00");
    const cleared = await agent.patch(path).send({ price: null });
    expect(cleared.body.items[0].price).toBeNull();
    const concurrent = await Promise.all([
      agent.patch(path).send({ price: "20.3" }),
      agent.patch(path).send({ checked: false }),
    ]);
    expect(concurrent.map((result) => result.status)).toEqual([200, 200]);
    expect((await agent.get("/api/v1/shopping-lists/current")).body.data.items[0]).toMatchObject({
      checked: false,
      price: "20.30",
    });
    await expect(
      prisma.shoppingListItem.update({ where: { id: current.items[0]!.id }, data: { price: "-1" } }),
    ).rejects.toThrow();
  });
  it("records the confirmed receipt amount once against the selected category and purchase month", async () => {
    const rice = await ingredient();
    const selected = await prisma.category.findFirstOrThrow({
      where: { userId, type: "EXPENSE", name: "Eating out" },
    });
    await agent.put("/api/v1/budgets").send({
      budgets: [
        { categoryId, amount: "100" },
        { categoryId: selected.id, amount: "50" },
      ],
    });
    let current = await check(await item((await list()).id, rice.id));
    const path = `/api/v1/shopping-lists/${current.id}/items/${current.items[0]!.id}`;
    current = (await agent.patch(path).send({ price: "12.50" })).body as ShoppingList;
    const input = checkout(current, { amount: "13", date: "2026-09-15", categoryId: selected.id });
    expect((await agent.post(`/api/v1/shopping-lists/${current.id}/complete`).send(input)).status).toBe(200);
    expect((await agent.post(`/api/v1/shopping-lists/${current.id}/complete`).send(input)).status).toBe(409);
    const budgets = (await agent.get("/api/v1/budgets?month=2026-09")).body as MonthlyBudgets;
    const rows = budgets.groups.flatMap((group) => group.budgets);
    expect(rows.find((budget) => budget.category.id === selected.id)).toMatchObject({
      amount: "50.00",
      spent: "13.00",
      remaining: "37.00",
    });
    expect(rows.find((budget) => budget.category.id === categoryId)?.spent).toBe("0.00");
    expect((await agent.get("/api/v1/budgets?month=2026-10")).body.totalSpent).toBe("0.00");
    expect(await prisma.transaction.count()).toBe(1);
    const history = (await agent.get("/api/v1/shopping-lists?status=completed")).body.data as ShoppingList[];
    expect(history[0]!.items[0]!.price).toBe("12.50");
    expect(history[0]!.transaction?.amount).toBe("13.00");
    expect((await agent.patch(path).send({ price: "99" })).status).toBe(409);
  });
});
