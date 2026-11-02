import type { IngredientValues } from "@keepitbalance/shared/groceries";
import { withGroceryWrite } from "../../shared/transaction.ts";
import { prisma } from "../../../../shared/db.ts";
import { ingredientInclude } from "../../shared/response.ts";
import type { Prisma } from "../../../../generated/prisma/client.ts";
import type { IngredientRow } from "../../shared/response.ts";

export function findMany(userId: string) {
  return prisma.ingredient.findMany({
    where: { userId },
    include: ingredientInclude,
    orderBy: { name: "asc" },
  });
}
export function create(userId: string, input: IngredientValues) {
  return withGroceryWrite(userId, (tx) =>
    tx.ingredient.create({ data: { ...input, userId }, include: ingredientInclude }),
  );
}
export function withLockedIngredient<T>(
  userId: string,
  id: string,
  action: (tx: Prisma.TransactionClient, existing: IngredientRow | null) => Promise<T>,
) {
  return withGroceryWrite(userId, async (tx) => {
    await tx.$queryRaw`SELECT id FROM ingredients WHERE id = ${id}::uuid AND user_id = ${userId}::uuid FOR UPDATE`;
    return action(tx, await tx.ingredient.findFirst({ where: { userId, id }, include: ingredientInclude }));
  });
}
export function update(tx: Prisma.TransactionClient, userId: string, id: string, input: IngredientValues) {
  return tx.ingredient.update({ where: { userId, id }, data: input, include: ingredientInclude });
}
export function remove(userId: string, id: string) {
  return withGroceryWrite(userId, (tx) => tx.ingredient.delete({ where: { userId, id } }));
}

export function findExistingNames(userId: string, names: string[]) {
  return prisma.ingredient.findMany({
    where: { userId, OR: names.map((name) => ({ name: { equals: name, mode: "insensitive" } })) },
    select: { name: true },
  });
}
export function createBatch(userId: string, ingredients: IngredientValues[]) {
  return withGroceryWrite(userId, async (tx) => {
    const created: IngredientRow[] = [];
    for (const input of ingredients)
      created.push(await tx.ingredient.create({ data: { ...input, userId }, include: ingredientInclude }));
    return created;
  });
}
