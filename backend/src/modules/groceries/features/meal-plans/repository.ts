import type { MealPlanEntry, MealSlot, MealValues } from "@keepitbalance/shared/meal-planning";
import type { Prisma } from "../../../../generated/prisma/client.ts";
import { prisma } from "../../../../shared/db.ts";
export const mealInclude = {
  recipe: {
    select: {
      id: true,
      name: true,
      servings: true,
      caloriesPerServing: true,
      updatedAt: true,
      image: { select: { recipeId: true } },
    },
  },
} satisfies Prisma.MealPlanEntryInclude;
type Row = Prisma.MealPlanEntryGetPayload<{ include: typeof mealInclude }>;
export function response(row: Row): MealPlanEntry {
  return {
    id: row.id,
    date: row.date.toISOString().slice(0, 10),
    slot: row.slot.toLowerCase() as MealSlot,
    servings: row.servings,
    eaten: row.eaten,
    updatedAt: row.updatedAt.toISOString(),
    recipe: {
      id: row.recipe.id,
      name: row.recipe.name,
      servings: row.recipe.servings,
      caloriesPerServing: row.recipe.caloriesPerServing,
      imageUrl: row.recipe.image
        ? `/recipes/${row.recipe.id}/image?v=${row.recipe.updatedAt.getTime()}`
        : null,
    },
  };
}
export const slots = { breakfast: "BREAKFAST", lunch: "LUNCH", dinner: "DINNER", snack: "SNACK" } as const;
function data(input: MealValues) {
  return { ...input, date: new Date(`${input.date}T00:00:00.000Z`), slot: slots[input.slot] };
}
export function findMany(userId: string, from: Date, before: Date) {
  return prisma.mealPlanEntry.findMany({
    where: { userId, date: { gte: from, lt: before } },
    include: mealInclude,
    orderBy: [{ date: "asc" }, { slot: "asc" }, { id: "asc" }],
  });
}
export function find(tx: Prisma.TransactionClient, userId: string, id: string) {
  return tx.mealPlanEntry.findFirst({ where: { id, userId }, include: mealInclude });
}
export function findRecipe(tx: Prisma.TransactionClient, userId: string, id: string) {
  return tx.recipe.findFirst({ where: { id, userId }, select: { id: true } });
}
export function create(tx: Prisma.TransactionClient, userId: string, input: MealValues) {
  return tx.mealPlanEntry.create({ data: { ...data(input), userId }, include: mealInclude });
}
export function update(tx: Prisma.TransactionClient, row: Row, input: MealValues | { eaten: boolean }) {
  return tx.mealPlanEntry.update({
    where: { id: row.id },
    data: {
      ...("recipeId" in input ? data(input) : input),
      updatedAt: new Date(Math.max(Date.now(), row.updatedAt.getTime() + 1)),
    },
    include: mealInclude,
  });
}
export function remove(tx: Prisma.TransactionClient, id: string) {
  return tx.mealPlanEntry.delete({ where: { id } });
}
