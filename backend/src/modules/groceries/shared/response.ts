import type { Ingredient, PantryItem, ShoppingList } from "@keepitbalance/shared/groceries";
import type { Prisma } from "../../../generated/prisma/client.ts";

export const ingredientInclude = {
  _count: { select: { pantryItems: true, recipeIngredients: true, shoppingListItems: true } },
} satisfies Prisma.IngredientInclude;
export type IngredientRow = Prisma.IngredientGetPayload<{ include: typeof ingredientInclude }>;
export function ingredientResponse(row: IngredientRow): Ingredient {
  return {
    id: row.id,
    name: row.name,
    unit: row.unit,
    inUse: Object.values(row._count).some((count) => count > 0),
  };
}
export const pantryInclude = {
  ingredient: { include: ingredientInclude },
} satisfies Prisma.PantryItemInclude;
export type PantryRow = Prisma.PantryItemGetPayload<{ include: typeof pantryInclude }>;
export function pantryResponse(row: PantryRow): PantryItem {
  return {
    id: row.id,
    ingredient: ingredientResponse(row.ingredient),
    quantity: row.quantity.toFixed(2),
    updatedAt: row.updatedAt.toISOString(),
  };
}
export const listInclude = {
  items: {
    include: { ingredient: { include: ingredientInclude } },
    orderBy: [{ ingredient: { name: "asc" } }, { id: "asc" }],
  },
  transaction: { select: { id: true, amount: true, date: true, categoryId: true } },
} satisfies Prisma.ShoppingListInclude;
export type ListRow = Prisma.ShoppingListGetPayload<{ include: typeof listInclude }>;
export function listResponse(row: ListRow): ShoppingList {
  return {
    id: row.id,
    weekStart: row.weekStart.toISOString().slice(0, 10),
    status: row.status === "OPEN" ? "open" : "completed",
    completedAt: row.completedAt?.toISOString() ?? null,
    updatedAt: row.updatedAt.toISOString(),
    items: row.items.map((item) => ({
      id: item.id,
      ingredient: ingredientResponse(item.ingredient),
      quantity: item.quantity.toFixed(2),
      checked: item.checked,
      price: item.price?.toFixed(2) ?? null,
    })),
    transaction: row.transaction
      ? {
          ...row.transaction,
          amount: row.transaction.amount.toFixed(2),
          date: row.transaction.date.toISOString().slice(0, 10),
        }
      : null,
  };
}
