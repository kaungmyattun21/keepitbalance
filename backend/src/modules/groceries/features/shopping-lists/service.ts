import { todayIn } from "@keepitbalance/shared/dates";
import type {
  CompleteShoppingValues,
  ShoppingItemValues,
  ShoppingItemsBatchValues,
  UpdateShoppingItemValues,
  ShoppingListsQuery,
} from "@keepitbalance/shared/groceries";
import { badRequest, conflict, notFound } from "../../../../shared/errors.ts";
import { createShoppingExpense } from "../../../finance/index.ts";
import { listResponse, type ListRow } from "../../shared/response.ts";
import { groceryWrite } from "../../shared/write-error.ts";
import * as repository from "./repository.ts";

function requireOpen(list: ListRow | null): asserts list is ListRow {
  if (!list) throw notFound("Shopping list not found");
  if (list.status !== "OPEN")
    throw conflict("SHOPPING_LIST_CLOSED", "This shopping list is already completed.");
}
export async function list(userId: string, query: ShoppingListsQuery) {
  return (
    await repository.findMany(
      userId,
      query.status === "open" ? "OPEN" : query.status === "completed" ? "COMPLETED" : undefined,
    )
  ).map(listResponse);
}
export async function current(userId: string) {
  const result = await repository.current(userId);
  return { ...result, data: result.data && listResponse(result.data) };
}
export async function create(userId: string, timezone: string, weekStart?: string) {
  const date = new Date(`${weekStart ?? todayIn(timezone)}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  return listResponse(await groceryWrite(() => repository.create(userId, date), "SHOPPING_LIST_EXISTS"));
}
export async function addItem(userId: string, id: string, input: ShoppingItemValues) {
  return addItems(userId, id, { items: [input] });
}
export async function addItems(userId: string, id: string, input: ShoppingItemsBatchValues) {
  return groceryWrite(() =>
    repository.withLockedList(userId, id, async (tx, list) => {
      requireOpen(list);
      const ids = [...new Set(input.items.map((item) => item.ingredientId))];
      const owned = await repository.findIngredients(tx, userId, ids);
      if (owned.length !== ids.length) throw notFound("Ingredient not found");
      for (const item of input.items) await repository.saveItem(tx, id, item.ingredientId, item.quantity);
      return listResponse(await repository.touch(tx, list));
    }),
  );
}
export async function updateItem(
  userId: string,
  id: string,
  itemId: string,
  input: UpdateShoppingItemValues,
) {
  return repository.withLockedList(userId, id, async (tx, list) => {
    requireOpen(list);
    const item = list.items.find((item) => item.id === itemId);
    if (!item) throw notFound("Shopping item not found");
    const quantityChanged = input.quantity !== undefined && input.quantity !== item.quantity.toFixed(2);
    await repository.updateItem(tx, itemId, {
      ...input,
      checked: input.checked ?? (quantityChanged ? false : undefined),
    });
    return listResponse(await repository.touch(tx, list));
  });
}
export async function removeItem(userId: string, id: string, itemId: string) {
  return repository.withLockedList(userId, id, async (tx, list) => {
    requireOpen(list);
    if (!list.items.some((item) => item.id === itemId)) throw notFound("Shopping item not found");
    await repository.removeItem(tx, itemId);
    return listResponse(await repository.touch(tx, list));
  });
}
export async function remove(userId: string, id: string) {
  await repository.withLockedList(userId, id, async (tx, list) => {
    requireOpen(list);
    await repository.remove(tx, id);
  });
}
export async function complete(userId: string, id: string, input: CompleteShoppingValues) {
  return groceryWrite(() =>
    repository.withLockedList(userId, id, async (tx, list) => {
      requireOpen(list);
      if (list.updatedAt.toISOString() !== input.updatedAt)
        throw conflict(
          "RESOURCE_CHANGED",
          "The shopping list changed. Close and reopen checkout to review the latest items.",
        );
      const bought = list.items.filter((item) => item.checked);
      if (!bought.length)
        throw badRequest("NO_CHECKED_ITEMS", "Check at least one purchased item before finishing shopping.");
      await createShoppingExpense(tx, userId, {
        shoppingListId: id,
        categoryId: input.categoryId,
        amount: input.amount,
        date: new Date(`${input.date}T00:00:00.000Z`),
      });
      // Consistent lock order avoids deadlocks with other stock adjustments.
      for (const item of bought.sort((a, b) => a.ingredientId.localeCompare(b.ingredientId)))
        await repository.addStock(tx, userId, item.ingredientId, item.quantity.toFixed(2));
      await repository.rememberCategory(tx, userId, input.categoryId);
      await repository.complete(tx, list);
      return listResponse(await repository.findList(tx, id));
    }),
  );
}
