import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import type {
  Ingredient,
  PantryItem,
  ShoppingList,
  CurrentShoppingList,
} from "@keepitbalance/shared/groceries";
import { api } from "@/shared/lib/api";
import { groceryKeys } from "./query-keys.ts";
import { mergeShoppingList } from "./shopping-list-cache.ts";

export { groceryKeys } from "./query-keys.ts";
export const ingredientsQuery = queryOptions({
  queryKey: groceryKeys.ingredients,
  queryFn: async ({ signal }) => (await api.get<{ data: Ingredient[] }>("/ingredients", { signal })).data,
});
export const pantryQuery = queryOptions({
  queryKey: groceryKeys.pantry,
  queryFn: async ({ signal }) => (await api.get<{ data: PantryItem[] }>("/pantry", { signal })).data,
});
export const currentListQuery = queryOptions({
  queryKey: groceryKeys.current,
  queryFn: async ({ signal, client }) => {
    const current = await api.get<CurrentShoppingList>("/shopping-lists/current", { signal });
    return current.data ? { ...current, data: mergeShoppingList(client, current.data) } : current;
  },
});
export const shoppingHistoryQuery = queryOptions({
  queryKey: groceryKeys.history,
  queryFn: async ({ signal }) =>
    (await api.get<{ data: ShoppingList[] }>("/shopping-lists", { signal, query: { status: "completed" } }))
      .data,
});
export const useIngredients = () => useSuspenseQuery(ingredientsQuery).data;
export const usePantry = () => useSuspenseQuery(pantryQuery).data;
export const useCurrentList = () => useSuspenseQuery(currentListQuery).data;
export const useShoppingHistory = () => useSuspenseQuery(shoppingHistoryQuery).data;

// The visible list does not depend on its concurrency token. Acknowledging a
// checkbox should update the token for checkout without rendering the page again.
function currentListView({ data, defaultCategoryId }: CurrentShoppingList) {
  if (!data) return { data: null, defaultCategoryId };
  const { updatedAt: _version, ...view } = data;
  return { data: view, defaultCategoryId };
}
export function useCurrentListView() {
  return useSuspenseQuery({ ...currentListQuery, select: currentListView }).data;
}
