import { createHash } from "node:crypto";
import {
  shiftDay,
  resolvePlanningPeriod,
  type PlanningPeriod,
  type ApplyGenerationValues,
  type GenerationPreview,
  type GenerationResult,
} from "@keepitbalance/shared/meal-planning";
import { badRequest, conflict } from "../../../../shared/errors.ts";
import { ingredientResponse, listResponse } from "../../shared/response.ts";
import { withGroceryWrite } from "../../shared/transaction.ts";
import { groceryWrite } from "../../shared/write-error.ts";
import { cents, quantity, requiredQuantities } from "./calculation.ts";
import * as repository from "./repository.ts";

type Snapshot = Awaited<ReturnType<typeof repository.snapshot>>;
function makePreview(userId: string, period: PlanningPeriod, state: Snapshot): GenerationPreview {
  const { weekStart, startDate, endDate } = resolvePlanningPeriod(period);
  const meals = state.meals.filter((meal) => !meal.eaten);
  let needs: Map<string, string>;
  try {
    needs = requiredQuantities(
      meals.flatMap((meal) =>
        meal.recipe.ingredients.map((item) => ({
          ingredientId: item.ingredientId,
          quantity: item.quantity.toFixed(2),
          recipeServings: meal.recipe.servings,
          plannedServings: meal.servings,
        })),
      ),
    );
  } catch (error) {
    if (error instanceof RangeError) throw badRequest("VALIDATION_ERROR", error.message);
    throw error;
  }
  const ingredients = new Map(state.list?.items.map((item) => [item.ingredientId, item.ingredient]) ?? []);
  for (const meal of meals)
    for (const item of meal.recipe.ingredients) ingredients.set(item.ingredientId, item.ingredient);
  const pantry = new Map(state.pantry.map((item) => [item.ingredientId, item.quantity.toFixed(2)]));
  const existing = new Map(state.list?.items.map((item) => [item.ingredientId, item]) ?? []);
  const rows = [...ingredients]
    .map(([id, ingredient]) => {
      const required = needs.get(id) ?? "0.00";
      const inPantry = pantry.get(id) ?? "0.00";
      const item = existing.get(id);
      const onList = item?.quantity.toFixed(2) ?? "0.00";
      const remaining = cents(required) > cents(inPantry) ? cents(required) - cents(inPantry) : 0n;
      const toAdd = remaining > cents(onList) ? remaining - cents(onList) : 0n;
      const excess = cents(onList) > remaining ? cents(onList) - remaining : 0n;
      return {
        ingredient: ingredientResponse(ingredient),
        required,
        inPantry,
        onList,
        toAdd: quantity(toAdd),
        excess: quantity(excess),
        blocked: toAdd > 0n && Boolean(item && (item.checked || item.price !== null)),
        planned: needs.has(id),
      };
    })
    .sort((a, b) => a.ingredient.name.localeCompare(b.ingredient.name));
  return {
    weekStart,
    startDate,
    endDate,
    token: createHash("sha256").update(JSON.stringify({ userId, startDate, endDate, state })).digest("hex"),
    listId: state.list?.id ?? null,
    listWeekStart: state.list?.weekStart.toISOString().slice(0, 10) ?? null,
    mealCount: meals.length,
    rows,
  };
}
function periodRange(period: PlanningPeriod) {
  const { startDate, endDate } = resolvePlanningPeriod(period);
  return {
    from: new Date(`${startDate}T00:00:00.000Z`),
    before: new Date(`${shiftDay(endDate, 1)}T00:00:00.000Z`),
  };
}
export function preview(userId: string, period: PlanningPeriod) {
  return withGroceryWrite(userId, async (tx) => {
    const { from, before } = periodRange(period);
    return makePreview(userId, period, await repository.snapshot(tx, userId, from, before));
  });
}
export function apply(userId: string, input: ApplyGenerationValues): Promise<GenerationResult> {
  return groceryWrite(() =>
    withGroceryWrite(userId, async (tx) => {
      const { from, before } = periodRange(input);
      const state = await repository.snapshot(tx, userId, from, before);
      const current = makePreview(userId, input, state);
      if (current.token !== input.token)
        throw conflict(
          "RESOURCE_CHANGED",
          "Your meals, pantry or shopping list changed. Refresh the preview before applying it.",
        );
      if (current.listWeekStart && current.listWeekStart !== current.weekStart)
        throw conflict(
          "SHOPPING_LIST_EXISTS",
          "Finish or delete the open shopping list for the other week first.",
        );
      const additions = current.rows.filter((row) => !row.blocked && row.toAdd !== "0.00");
      let list = state.list;
      if (additions.length) {
        list ??= await repository.createList(tx, userId, new Date(`${current.weekStart}T00:00:00.000Z`));
        for (const row of additions) await repository.add(tx, list.id, row.ingredient.id, row.toAdd);
        list = await repository.touch(tx, list.id, list.updatedAt);
      }
      return {
        data: list && listResponse(list),
        addedCount: additions.length,
        reviewCount: current.rows.filter((row) => row.blocked || (row.planned && row.excess !== "0.00"))
          .length,
      };
    }),
  );
}
