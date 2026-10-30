import type { QueryClient } from "@tanstack/react-query";
import type { CurrentShoppingList, ShoppingItem, ShoppingList } from "@keepitbalance/shared/groceries";
import { groceryKeys } from "./query-keys.ts";

export type ShoppingItemEdit = { itemId: string } & ({ checked: boolean } | { price: string | null });
type EditContext = { previous: ShoppingItem | undefined; settled: boolean };

// Both GETs and mutation responses must preserve edits still waiting to save.
// Settled edits are excluded even while their mutation callbacks are running.
export function mergeShoppingList(client: QueryClient, response: ShoppingList): ShoppingList {
  const cached = client.getQueryData<CurrentShoppingList>(groceryKeys.current)?.data;
  const current = cached?.id === response.id ? cached : undefined;
  const confirmed = current && current.updatedAt > response.updatedAt ? current : response;
  const pending = client
    .getMutationCache()
    .findAll({ mutationKey: [...groceryKeys.itemUpdates, response.id], status: "pending" })
    .filter((mutation) => !(mutation.state.context as EditContext | undefined)?.settled)
    .map((mutation) => mutation.state.variables as ShoppingItemEdit);
  const items = new Map(confirmed.items.map((item) => [item.id, item]));
  // Keep existing rows in place, adding new server rows without losing them.
  const order = [...(current?.items.map((item) => item.id) ?? []), ...items.keys()];
  const ordered = [...new Set(order)].flatMap((id) => {
    const item = items.get(id);
    return item ? [item] : [];
  });
  return {
    ...confirmed,
    items: ordered.map((item) =>
      pending.reduce((result, edit) => {
        if (edit.itemId !== item.id) return result;
        return { ...result, ...("price" in edit ? { price: edit.price } : { checked: edit.checked }) };
      }, item),
    ),
  };
}
