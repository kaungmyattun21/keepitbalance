import type { Prisma } from "../../../../generated/prisma/client.ts";
import { listInclude, pantryInclude } from "../../shared/response.ts";
import { recipeInclude } from "../recipes/repository.ts";
export async function snapshot(tx: Prisma.TransactionClient, userId: string, from: Date, before: Date) {
  const meals = await tx.mealPlanEntry.findMany({
    where: { userId, date: { gte: from, lt: before } },
    include: { recipe: { include: recipeInclude } },
    orderBy: { id: "asc" },
  });
  const pantry = await tx.pantryItem.findMany({
    where: { userId },
    include: pantryInclude,
    orderBy: { id: "asc" },
  });
  const list = await tx.shoppingList.findFirst({ where: { userId, status: "OPEN" }, include: listInclude });
  return { meals, pantry, list };
}
export function createList(tx: Prisma.TransactionClient, userId: string, weekStart: Date) {
  return tx.shoppingList.create({ data: { userId, weekStart }, include: listInclude });
}
export function add(
  tx: Prisma.TransactionClient,
  shoppingListId: string,
  ingredientId: string,
  quantity: string,
) {
  return tx.shoppingListItem.upsert({
    where: { shoppingListId_ingredientId: { shoppingListId, ingredientId } },
    create: { shoppingListId, ingredientId, quantity },
    update: { quantity: { increment: quantity } },
  });
}
export function touch(tx: Prisma.TransactionClient, id: string, updatedAt: Date) {
  return tx.shoppingList.update({
    where: { id },
    data: { updatedAt: new Date(Math.max(Date.now(), updatedAt.getTime() + 1)) },
    include: listInclude,
  });
}
