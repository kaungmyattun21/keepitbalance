import type {
  IngredientValues,
  IngredientsBatchValues,
  ShoppingItemsBatchValues,
  Ingredient,
  CreatePantryValues,
  UpdatePantryValues,
  AdjustPantryValues,
  ShoppingItemValues,
  UpdateShoppingItemValues,
  CompleteShoppingValues,
  ShoppingList,
} from "@keepitbalance/shared/groceries";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { invalidateMoneyQueries } from "@/modules/finance";
import { api, ApiError } from "@/shared/lib/api";
import { groceryKeys } from "./queries.ts";

function useRefreshGroceries() {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: groceryKeys.all });
}
export function useIngredientMutation() {
  const refresh = useRefreshGroceries();
  return useMutation({
    mutationFn: (input: { id?: string; values: IngredientValues } | { id: string; values?: undefined }) => {
      if (!input.values) return api.delete(`/ingredients/${input.id}`).then(() => undefined);
      return input.id
        ? api.put<Ingredient>(`/ingredients/${input.id}`, input.values)
        : api.post<Ingredient>("/ingredients", input.values);
    },
    onSuccess: refresh,
    onError: refresh,
  });
}
export function usePantryMutation() {
  const refresh = useRefreshGroceries();
  return useMutation({
    mutationFn: (
      input:
        | { action: "create"; values: CreatePantryValues }
        | { action: "update"; id: string; values: UpdatePantryValues }
        | { action: "adjust"; id: string; values: AdjustPantryValues }
        | { action: "delete"; id: string },
    ) => {
      if (input.action === "create") return api.post("/pantry", input.values);
      if (input.action === "update") return api.put(`/pantry/${input.id}`, input.values);
      if (input.action === "adjust") return api.post(`/pantry/${input.id}/adjustments`, input.values);
      return api.delete(`/pantry/${input.id}`);
    },
    onSuccess: refresh,
    onError: refresh,
  });
}
export function useShoppingMutation() {
  const client = useQueryClient();
  const refresh = useRefreshGroceries();
  return useMutation({
    mutationFn: (
      input:
        | { action: "create" }
        | { action: "delete"; id: string }
        | { action: "add"; id: string; values: ShoppingItemValues }
        | { action: "addBatch"; id: string; values: ShoppingItemsBatchValues }
        | { action: "update"; id: string; itemId: string; values: UpdateShoppingItemValues }
        | { action: "remove"; id: string; itemId: string }
        | { action: "complete"; id: string; values: CompleteShoppingValues },
    ): Promise<ShoppingList | void> => {
      if (input.action === "create") return api.post<ShoppingList>("/shopping-lists", {});
      if (input.action === "delete") return api.delete(`/shopping-lists/${input.id}`);
      if (input.action === "addBatch")
        return api.post<ShoppingList>(`/shopping-lists/${input.id}/items/batch`, input.values);
      if (input.action === "add")
        return api.post<ShoppingList>(`/shopping-lists/${input.id}/items`, input.values);
      if (input.action === "update")
        return api.patch<ShoppingList>(`/shopping-lists/${input.id}/items/${input.itemId}`, input.values);
      if (input.action === "remove") return api.delete(`/shopping-lists/${input.id}/items/${input.itemId}`);
      return api.post<ShoppingList>(`/shopping-lists/${input.id}/complete`, input.values);
    },
    onSuccess: async (_data, input) => {
      await refresh();
      if (input.action === "complete") await invalidateMoneyQueries(client);
    },
    onError: refresh,
  });
}
export function groceryError(error: unknown) {
  return error instanceof ApiError ? error.message : "Something went wrong. Please try again.";
}

export function useIngredientsBatchMutation() {
  const refresh = useRefreshGroceries();
  return useMutation({
    mutationFn: (values: IngredientsBatchValues) =>
      api.post<{ data: Ingredient[] }>("/ingredients/batch", values),
    onSuccess: refresh,
    onError: refresh,
  });
}
