import type { Prisma } from "../../../../generated/prisma/client.ts";
import { badRequest, notFound } from "../../../../shared/errors.ts";

type ShoppingExpense = { shoppingListId: string; categoryId: string; amount: string; date: Date };
export async function createShoppingExpense(
  tx: Prisma.TransactionClient,
  userId: string,
  input: ShoppingExpense,
) {
  const category = await tx.category.findFirst({
    where: { id: input.categoryId, userId },
    select: { type: true },
  });
  if (!category) throw notFound("Category not found");
  if (category.type !== "EXPENSE") throw badRequest("CATEGORY_TYPE_MISMATCH", "Choose an expense category.");
  return tx.transaction.create({ data: { ...input, userId, type: "EXPENSE", note: "Grocery shopping" } });
}
