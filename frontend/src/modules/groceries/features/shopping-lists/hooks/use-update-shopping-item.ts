import type { CurrentShoppingList, ShoppingList } from "@keepitbalance/shared/groceries";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import { groceryKeys } from "../../../shared/queries.ts";

import { mergeShoppingList, type ShoppingItemEdit } from "../../../shared/shopping-list-cache.ts";

export function useUpdateShoppingItem(listId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationKey: [...groceryKeys.itemUpdates, listId],
    scope: { id: `shopping-item-updates-${listId}` },
    mutationFn: ({ itemId, ...values }: ShoppingItemEdit) =>
      api.patch<ShoppingList>(`/shopping-lists/${listId}/items/${itemId}`, values),
    onMutate: async (input) => {
      await client.cancelQueries({ queryKey: groceryKeys.current, exact: true });
      const previous = client
        .getQueryData<CurrentShoppingList>(groceryKeys.current)
        ?.data?.items.find((item) => item.id === input.itemId);
      client.setQueryData<CurrentShoppingList>(groceryKeys.current, (current) => {
        if (!current?.data || current.data.id !== listId) return current;
        return {
          ...current,
          data: {
            ...current.data,
            items: current.data.items.map((item) =>
              item.id === input.itemId
                ? { ...item, ...("price" in input ? { price: input.price } : { checked: input.checked }) }
                : item,
            ),
          },
        };
      });
      return { previous, settled: false };
    },
    onSuccess: (list, _input, context) => {
      context.settled = true;
      const needsReconcile = client.getQueryState(groceryKeys.current)?.isInvalidated;
      client.setQueryData<CurrentShoppingList>(groceryKeys.current, (current) => {
        if (!current?.data || current.data.id !== listId) return current;
        return { ...current, data: mergeShoppingList(client, list) };
      });
      if (needsReconcile) {
        return client.invalidateQueries({ queryKey: groceryKeys.current, exact: true, refetchType: "none" });
      }
    },
    onError: (_error, input, context) => {
      if (context) context.settled = true;
      const previous = context?.previous;
      client.setQueryData<CurrentShoppingList>(groceryKeys.current, (current) => {
        if (!current?.data || current.data.id !== listId || previous === undefined) return current;
        return {
          ...current,
          data: {
            ...current.data,
            items: current.data.items.map((item) =>
              item.id === input.itemId
                ? {
                    ...item,
                    ...("price" in input ? { price: previous.price } : { checked: previous.checked }),
                  }
                : item,
            ),
          },
        };
      });
      // Reconcile uncertain failures after the queue drains, without replacing
      // edits that are still pending on other rows.
      void client.invalidateQueries({ queryKey: groceryKeys.current, exact: true, refetchType: "none" });
    },
    onSettled: () => {
      if (
        client.isMutating({ mutationKey: groceryKeys.itemUpdates }) === 1 &&
        client.getQueryState(groceryKeys.current)?.isInvalidated
      ) {
        return client.invalidateQueries({ queryKey: groceryKeys.current, exact: true });
      }
    },
  });
}
