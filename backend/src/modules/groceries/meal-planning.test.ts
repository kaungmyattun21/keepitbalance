import type { Ingredient, ShoppingList } from "@keepitbalance/shared/groceries";
import type { Recipe, GenerationPreview, MealPlanEntry } from "@keepitbalance/shared/meal-planning";
import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../../shared/db.ts";
import { newAgent, signUp, type Agent } from "../../test/http.ts";
let agent: Agent;
const week = "2026-10-26";
beforeEach(async () => {
  agent = newAgent();
  await signUp(agent);
});
async function ingredient(name = "Rice", owner = agent): Promise<Ingredient> {
  const result = await owner.post("/api/v1/ingredients").send({ name, unit: "g" });
  expect(result.status).toBe(201);
  return result.body as Ingredient;
}
function recipeInput(id: string) {
  return {
    name: "Rice bowl",
    servings: 2,
    steps: "Cook the rice.",
    caloriesPerServing: 300,
    ingredients: [{ ingredientId: id, quantity: "300" }],
  };
}
async function recipe(id: string, owner = agent): Promise<Recipe> {
  const result = await owner.post("/api/v1/recipes").send(recipeInput(id));
  expect(result.status).toBe(201);
  return result.body as Recipe;
}
async function meal(recipeId: string, overrides: object = {}, owner = agent): Promise<MealPlanEntry> {
  const result = await owner
    .post("/api/v1/meal-plans")
    .send({ recipeId, date: week, slot: "dinner", servings: 3, ...overrides });
  expect(result.status).toBe(201);
  return result.body as MealPlanEntry;
}
async function preview(owner = agent): Promise<GenerationPreview> {
  const result = await owner.get(`/api/v1/shopping-generation?weekStart=${week}`);
  expect(result.status).toBe(200);
  return result.body as GenerationPreview;
}
async function apply(value: GenerationPreview, owner = agent) {
  return owner.post("/api/v1/shopping-generation").send({ weekStart: value.weekStart, token: value.token });
}
async function other() {
  const owner = newAgent();
  await signUp(owner, { email: "other@example.com" });
  return owner;
}

describe("recipes and weekly planning", () => {
  it("creates, edits, versions and deletes recipes while protecting referenced ingredients and recipes", async () => {
    const rice = await ingredient();
    const current = await recipe(rice.id);
    expect(current.ingredients[0]).toMatchObject({
      quantity: "300.00",
      ingredient: { id: rice.id, inUse: true },
    });
    expect((await agent.get("/api/v1/recipes")).body.data).toHaveLength(1);
    const edit = { ...recipeInput(rice.id), name: "Brown rice", updatedAt: current.updatedAt };
    const saved = await agent.put(`/api/v1/recipes/${current.id}`).send(edit);
    expect(saved.status).toBe(200);
    expect((await agent.put(`/api/v1/recipes/${current.id}`).send(edit)).status).toBe(409);
    expect((await agent.delete(`/api/v1/ingredients/${rice.id}`)).status).toBe(409);
    const planned = await meal(current.id);
    expect((await agent.get("/api/v1/recipes")).body.data[0].inUse).toBe(true);
    expect((await agent.delete(`/api/v1/recipes/${current.id}`)).body.error.code).toBe("RECIPE_IN_USE");
    expect((await agent.delete(`/api/v1/meal-plans/${planned.id}`)).status).toBe(204);
    expect((await agent.delete(`/api/v1/recipes/${current.id}`)).status).toBe(204);
    expect((await agent.delete(`/api/v1/ingredients/${rice.id}`)).status).toBe(204);
  });
  it("validates ownership, duplicate ingredients, dates, slots and serving counts", async () => {
    const rice = await ingredient();
    const current = await recipe(rice.id);
    const owner = await other();
    expect((await owner.get("/api/v1/recipes")).body.data).toEqual([]);
    expect((await owner.post("/api/v1/recipes").send(recipeInput(rice.id))).status).toBe(404);
    expect(
      (
        await owner
          .put(`/api/v1/recipes/${current.id}`)
          .send({ ...recipeInput(rice.id), updatedAt: current.updatedAt })
      ).status,
    ).toBe(404);
    expect((await owner.delete(`/api/v1/recipes/${current.id}`)).status).toBe(404);
    expect(
      (
        await owner
          .post("/api/v1/meal-plans")
          .send({ recipeId: current.id, date: week, slot: "dinner", servings: 1 })
      ).status,
    ).toBe(404);
    expect(
      (
        await agent.post("/api/v1/recipes").send({
          ...recipeInput(rice.id),
          ingredients: [recipeInput(rice.id).ingredients[0], recipeInput(rice.id).ingredients[0]],
        })
      ).status,
    ).toBe(400);
    for (const values of [{ slot: "brunch" }, { servings: 0 }, { servings: 1.2 }, { date: "bad" }])
      expect(
        (
          await agent
            .post("/api/v1/meal-plans")
            .send({ recipeId: current.id, date: week, slot: "dinner", servings: 1, ...values })
        ).status,
      ).toBe(400);
    for (const date of ["bad", "2026-10-27", "2026-02-30", "9999-12-27"])
      expect((await agent.get(`/api/v1/shopping-generation?weekStart=${date}`)).status).toBe(400);
    expect((await newAgent().get("/api/v1/recipes")).status).toBe(401);
    expect((await newAgent().get(`/api/v1/meal-plans?weekStart=${week}`)).status).toBe(401);
  });
  it("filters weeks, updates and marks meals eaten without consuming pantry stock", async () => {
    const rice = await ingredient();
    const current = await recipe(rice.id);
    const planned = await meal(current.id);
    await meal(current.id, { date: "2026-11-02" });
    expect((await agent.get(`/api/v1/meal-plans?weekStart=${week}`)).body.data).toHaveLength(1);
    const marked = await agent
      .patch(`/api/v1/meal-plans/${planned.id}`)
      .send({ eaten: true, updatedAt: planned.updatedAt });
    expect(marked.status).toBe(200);
    expect(marked.body.eaten).toBe(true);
    expect(
      (
        await agent
          .patch(`/api/v1/meal-plans/${planned.id}`)
          .send({ eaten: false, updatedAt: planned.updatedAt })
      ).status,
    ).toBe(409);
    expect((await preview()).mealCount).toBe(0);
    expect(await prisma.pantryItem.count()).toBe(0);
    const updated = await agent.put(`/api/v1/meal-plans/${planned.id}`).send({
      recipeId: current.id,
      date: week,
      slot: "lunch",
      servings: 2,
      eaten: false,
      updatedAt: marked.body.updatedAt,
    });
    expect(updated.status).toBe(200);
    expect(updated.body).toMatchObject({ slot: "lunch", servings: 2, eaten: false });
    const owner = await other();
    expect(
      (
        await owner
          .patch(`/api/v1/meal-plans/${planned.id}`)
          .send({ eaten: true, updatedAt: updated.body.updatedAt })
      ).status,
    ).toBe(404);
    expect((await owner.delete(`/api/v1/meal-plans/${planned.id}`)).status).toBe(404);
  });
});

describe("shopping generation", () => {
  it("subtracts pantry and existing quantities, preserves checked/priced/manual items and never appends twice", async () => {
    const rice = await ingredient();
    const eggs = await ingredient("Eggs");
    const soap = await ingredient("Soap");
    const created = await agent.post("/api/v1/recipes").send({
      ...recipeInput(rice.id),
      ingredients: [
        { ingredientId: rice.id, quantity: "300" },
        { ingredientId: eggs.id, quantity: "2" },
      ],
    });
    await meal((created.body as Recipe).id);
    await agent.post("/api/v1/pantry").send({ ingredientId: rice.id, quantity: "150" });
    const list = (await agent.post("/api/v1/shopping-lists").send({ weekStart: week })).body as ShoppingList;
    for (const [ingredientId, quantity] of [
      [rice.id, "100"],
      [eggs.id, "1"],
      [soap.id, "2"],
    ])
      expect(
        (await agent.post(`/api/v1/shopping-lists/${list.id}/items`).send({ ingredientId, quantity })).status,
      ).toBe(201);
    const listed = (await agent.get("/api/v1/shopping-lists/current")).body.data as ShoppingList;
    const egg = listed.items.find((item) => item.ingredient.id === eggs.id)!;
    await agent
      .patch(`/api/v1/shopping-lists/${list.id}/items/${egg.id}`)
      .send({ checked: true, price: "0" });
    const before = await preview();
    expect(before.rows.find((row) => row.ingredient.id === rice.id)).toMatchObject({
      required: "450.00",
      inPantry: "150.00",
      onList: "100.00",
      toAdd: "200.00",
      blocked: false,
    });
    expect(before.rows.find((row) => row.ingredient.id === eggs.id)).toMatchObject({
      toAdd: "2.00",
      blocked: true,
    });
    expect(before.rows.find((row) => row.ingredient.id === soap.id)?.planned).toBe(false);
    const result = await apply(before);
    expect(result.status).toBe(200);
    expect(result.body.addedCount).toBe(1);
    const saved = result.body.data as ShoppingList;
    expect(saved.items.find((item) => item.ingredient.id === rice.id)?.quantity).toBe("300.00");
    expect(saved.items.find((item) => item.ingredient.id === eggs.id)).toMatchObject({
      quantity: "1.00",
      checked: true,
      price: "0.00",
    });
    expect(saved.items.find((item) => item.ingredient.id === soap.id)?.quantity).toBe("2.00");
    expect((await apply(before)).status).toBe(409);
    const again = await preview();
    expect(again.rows.find((row) => row.ingredient.id === rice.id)?.toAdd).toBe("0.00");
    expect((await apply(again)).body.addedCount).toBe(0);
    expect(await prisma.transaction.count()).toBe(0);
    expect((await prisma.pantryItem.findFirstOrThrow()).quantity.toFixed(2)).toBe("150.00");
  });
  it("creates one list under concurrent application and combines fractions before rounding", async () => {
    const rice = await ingredient();
    const created = await agent.post("/api/v1/recipes").send({
      ...recipeInput(rice.id),
      servings: 3,
      ingredients: [{ ingredientId: rice.id, quantity: "0.01" }],
    });
    for (let index = 0; index < 3; index++) await meal((created.body as Recipe).id, { servings: 1 });
    const before = await preview();
    expect(before.rows[0]!.required).toBe("0.01");
    const results = await Promise.all([apply(before), apply(before)]);
    expect(results.map((result) => result.status).sort()).toEqual([200, 409]);
    expect(await prisma.shoppingList.count()).toBe(1);
    expect((await prisma.shoppingListItem.findFirstOrThrow()).quantity.toFixed(2)).toBe("0.01");
    const foreign = await preview(await other());
    expect(foreign.rows).toEqual([]);
  });
  it("invalidates previews after pantry, recipe, meal and shopping-list changes", async () => {
    const rice = await ingredient();
    const current = await recipe(rice.id);
    let planned = await meal(current.id);
    let before = await preview();
    const pantry = await agent.post("/api/v1/pantry").send({ ingredientId: rice.id, quantity: "1" });
    expect((await apply(before)).status).toBe(409);
    before = await preview();
    const edited = await agent
      .put(`/api/v1/recipes/${current.id}`)
      .send({ ...recipeInput(rice.id), servings: 4, updatedAt: current.updatedAt });
    expect(edited.status).toBe(200);
    expect((await apply(before)).status).toBe(409);
    before = await preview();
    planned = (
      await agent
        .patch(`/api/v1/meal-plans/${planned.id}`)
        .send({ eaten: true, updatedAt: planned.updatedAt })
    ).body as MealPlanEntry;
    expect((await apply(before)).status).toBe(409);
    await agent
      .patch(`/api/v1/meal-plans/${planned.id}`)
      .send({ eaten: false, updatedAt: planned.updatedAt });
    before = await preview();
    await agent.post("/api/v1/shopping-lists").send({ weekStart: week });
    expect((await apply(before)).status).toBe(409);
    before = await preview();
    await agent
      .post(`/api/v1/pantry/${pantry.body.id}/adjustments`)
      .send({ direction: "add", quantity: "1" });
    expect((await apply(before)).status).toBe(409);
    expect(await prisma.shoppingListItem.count()).toBe(0);
  });
  it("keeps excess items for review, blocks a different open week and rejects overflowing needs", async () => {
    const rice = await ingredient();
    const current = await recipe(rice.id);
    await meal(current.id);
    const list = (await agent.post("/api/v1/shopping-lists").send({ weekStart: week })).body as ShoppingList;
    await agent
      .post(`/api/v1/shopping-lists/${list.id}/items`)
      .send({ ingredientId: rice.id, quantity: "500" });
    const before = await preview();
    expect(before.rows[0]).toMatchObject({ excess: "50.00", toAdd: "0.00" });
    await apply(before);
    expect((await prisma.shoppingListItem.findFirstOrThrow()).quantity.toFixed(2)).toBe("500.00");
    await agent.delete(`/api/v1/shopping-lists/${list.id}`);
    await agent.post("/api/v1/shopping-lists").send({ weekStart: "2026-11-02" });
    expect((await apply(await preview())).body.error.code).toBe("SHOPPING_LIST_EXISTS");
    await agent.put(`/api/v1/recipes/${current.id}`).send({
      ...recipeInput(rice.id),
      servings: 1,
      ingredients: [{ ingredientId: rice.id, quantity: "99999999.99" }],
      updatedAt: current.updatedAt,
    });
    expect((await agent.get(`/api/v1/shopping-generation?weekStart=${week}`)).status).toBe(400);
  });
});
