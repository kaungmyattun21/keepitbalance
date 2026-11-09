import {
  shiftDay,
  resolvePlanningPeriod,
  type PlanningPeriod,
  type PlanningDateRange,
  type MealValues,
  type UpdateMealValues,
  type MealEatenValues,
} from "@keepitbalance/shared/meal-planning";
import { conflict, notFound } from "../../../../shared/errors.ts";
import { withGroceryWrite } from "../../shared/transaction.ts";
import * as repository from "./repository.ts";
export async function list(userId: string, period: PlanningPeriod) {
  const { startDate, endDate } = resolvePlanningPeriod(period);
  return (
    await repository.findMany(
      userId,
      new Date(`${startDate}T00:00:00.000Z`),
      new Date(`${shiftDay(endDate, 1)}T00:00:00.000Z`),
    )
  ).map(repository.response);
}
export function create(userId: string, input: MealValues) {
  return withGroceryWrite(userId, async (tx) => {
    if (!(await repository.findRecipe(tx, userId, input.recipeId))) throw notFound("Recipe not found");
    return repository.response(await repository.create(tx, userId, input));
  });
}
export function update(userId: string, id: string, input: UpdateMealValues | MealEatenValues) {
  return withGroceryWrite(userId, async (tx) => {
    const row = await repository.find(tx, userId, id);
    if (!row) throw notFound("Planned meal not found");
    if (row.updatedAt.toISOString() !== input.updatedAt)
      throw conflict("RESOURCE_CHANGED", "This meal changed. Refresh your plan before saving.");
    const { updatedAt: _version, ...values } = input;
    if ("recipeId" in values && !(await repository.findRecipe(tx, userId, values.recipeId)))
      throw notFound("Recipe not found");
    return repository.response(await repository.update(tx, row, values));
  });
}
export async function remove(userId: string, id: string) {
  await withGroceryWrite(userId, async (tx) => {
    const row = await repository.find(tx, userId, id);
    if (!row) throw notFound("Planned meal not found");
    await repository.remove(tx, id);
  });
}

export async function getPreferences(userId: string): Promise<PlanningDateRange | null> {
  const user = await repository.findPreferences(userId);
  if (!user) throw notFound("User not found");
  return user.mealPlanStartDate && user.mealPlanEndDate
    ? {
        startDate: user.mealPlanStartDate.toISOString().slice(0, 10),
        endDate: user.mealPlanEndDate.toISOString().slice(0, 10),
      }
    : null;
}
export async function savePreferences(userId: string, range: PlanningDateRange): Promise<PlanningDateRange> {
  await repository.updatePreferences(userId, range);
  return range;
}
