import type { Prisma } from "../../../../generated/prisma/client.ts";
import { prisma } from "../../../../shared/db.ts";
import { listInclude, type ListRow } from "../../shared/response.ts";

export function findMany(userId: string, status?: "OPEN" | "COMPLETED") {
  return prisma.shoppingList.findMany({
    where: { userId, status },
    include: listInclude,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });
}
export async function current(userId: string) {
  const [data, user] = await Promise.all([
    prisma.shoppingList.findFirst({ where: { userId, status: "OPEN" }, include: listInclude }),
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { groceryCategoryId: true } }),
  ]);
  const category = await prisma.category.findFirst({
    where: {
      userId,
      type: "EXPENSE",
      ...(user.groceryCategoryId ? { id: user.groceryCategoryId } : { name: "Groceries" }),
    },
    select: { id: true },
  });
  return { data, defaultCategoryId: category?.id ?? null };
}
export function create(userId: string, weekStart: Date) {
  return prisma.shoppingList.create({ data: { userId, weekStart }, include: listInclude });
}
export function withLockedList<T>(
  userId: string,
  id: string,
  action: (tx: Prisma.TransactionClient, list: ListRow | null) => Promise<T>,
) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM shopping_lists WHERE id = ${id}::uuid AND user_id = ${userId}::uuid FOR UPDATE`;
    return action(tx, await tx.shoppingList.findFirst({ where: { id, userId }, include: listInclude }));
  });
}
export function findIngredient(tx: Prisma.TransactionClient, userId: string, id: string) {
  return tx.ingredient.findFirst({ where: { id, userId } });
}
export function saveItem(
  tx: Prisma.TransactionClient,
  shoppingListId: string,
  ingredientId: string,
  quantity: string,
) {
  return tx.shoppingListItem.upsert({
    where: { shoppingListId_ingredientId: { shoppingListId, ingredientId } },
    create: { shoppingListId, ingredientId, quantity },
    update: { quantity: { increment: quantity }, checked: false },
  });
}
export function updateItem(
  tx: Prisma.TransactionClient,
  id: string,
  data: Prisma.ShoppingListItemUpdateInput,
) {
  return tx.shoppingListItem.update({ where: { id }, data });
}
export function removeItem(tx: Prisma.TransactionClient, id: string) {
  return tx.shoppingListItem.delete({ where: { id } });
}
export function touch(tx: Prisma.TransactionClient, list: ListRow) {
  return tx.shoppingList.update({
    where: { id: list.id },
    data: { updatedAt: new Date(Math.max(Date.now(), list.updatedAt.getTime() + 1)) },
    include: listInclude,
  });
}
export function remove(tx: Prisma.TransactionClient, id: string) {
  return tx.shoppingList.delete({ where: { id } });
}
export function complete(tx: Prisma.TransactionClient, list: ListRow) {
  return tx.shoppingList.update({
    where: { id: list.id },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
      updatedAt: new Date(Math.max(Date.now(), list.updatedAt.getTime() + 1)),
    },
  });
}
export function addStock(
  tx: Prisma.TransactionClient,
  userId: string,
  ingredientId: string,
  quantity: string,
) {
  return tx.pantryItem.upsert({
    where: { userId_ingredientId: { userId, ingredientId } },
    create: { userId, ingredientId, quantity },
    update: { quantity: { increment: quantity } },
  });
}
export function rememberCategory(tx: Prisma.TransactionClient, userId: string, categoryId: string) {
  return tx.user.update({ where: { id: userId }, data: { groceryCategoryId: categoryId } });
}
export function findList(tx: Prisma.TransactionClient, id: string) {
  return tx.shoppingList.findUniqueOrThrow({ where: { id }, include: listInclude });
}

export function findIngredients(tx: Prisma.TransactionClient, userId: string, ids: string[]) {
  return tx.ingredient.findMany({ where: { userId, id: { in: ids } }, select: { id: true } });
}
