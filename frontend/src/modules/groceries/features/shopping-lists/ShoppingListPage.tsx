import { shoppingTotals } from "@keepitbalance/shared/groceries";
import { formatMoney } from "@/shared/lib/format";
import { ShoppingItemsBatchForm } from "./components/ShoppingItemsBatchForm.tsx";
import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { ShoppingItem, ShoppingList, CurrentShoppingList } from "@keepitbalance/shared/groceries";
import { toast } from "sonner";
import { ShoppingBasket } from "lucide-react";
import { DocumentTitle } from "@/shared/components/DocumentTitle";
import { Button } from "@/shared/components/ui/button";
import { SectionCard } from "@/shared/components/SectionCard";
import { useCurrentListView, groceryKeys } from "../../shared/queries.ts";
import { useShoppingMutation, groceryError } from "../../shared/use-grocery-mutations.ts";
import { GroceryDrawer } from "../../shared/components/GroceryDrawer.tsx";
import { ConfirmRemoval } from "../../shared/components/ConfirmRemoval.tsx";
import { ShoppingItemForm } from "./components/ShoppingItemForm.tsx";
import { ShoppingItemRow } from "./components/ShoppingItemRow.tsx";
import { ShoppingListActions } from "./components/ShoppingListActions.tsx";
import { CheckoutForm } from "./components/CheckoutForm.tsx";

export function ShoppingListPage() {
  const { data: list, defaultCategoryId } = useCurrentListView();
  const client = useQueryClient();
  const listId = list?.id;
  const totals = shoppingTotals(list?.items ?? []);
  const mutation = useShoppingMutation();
  const { mutateAsync } = mutation;
  const [editor, setEditor] = useState<ShoppingItem | "new" | null>(null);
  const [checkout, setCheckout] = useState<ShoppingList | null>(null);
  const [deleting, setDeleting] = useState(false);
  async function start() {
    try {
      await mutation.mutateAsync({ action: "create" });
    } catch (error) {
      toast.error(groceryError(error));
    }
  }
  const remove = useCallback(
    async (item: ShoppingItem) => {
      if (!listId) return;
      try {
        await mutateAsync({ action: "remove", id: listId, itemId: item.id });
      } catch (error) {
        toast.error(groceryError(error));
      }
    },
    [listId, mutateAsync],
  );
  function openCheckout() {
    if (client.isMutating({ mutationKey: groceryKeys.itemUpdates })) return;
    const latest = client.getQueryData<CurrentShoppingList>(groceryKeys.current)?.data;
    if (latest && latest.id === listId) setCheckout(latest);
  }
  return (
    <div className="flex w-full flex-col gap-5">
      <DocumentTitle title="Shopping list" />
      {!list ? (
        <section
          aria-label="No open shopping list"
          className="flex flex-col items-center gap-4 rounded-xl border border-dashed bg-card/50 px-6 py-14 text-center"
        >
          <ShoppingBasket className="size-8 text-brand" aria-hidden />
          <h2 className="text-lg font-semibold">Start your next shopping trip</h2>
          <p className="text-sm text-muted-foreground">
            Add ingredients, check off purchases and record the total when you're done.
          </p>
          <Button disabled={mutation.isPending} onClick={() => void start()}>
            {mutation.isPending ? "Creating…" : "Create shopping list"}
          </Button>
        </section>
      ) : (
        <>
          <SectionCard
            title="Your shopping list"
            description={`${list.items.filter((item) => item.checked).length} of ${list.items.length} items purchased`}
            action={<Button onClick={() => setEditor("new")}>Add item</Button>}
          >
            {list.items.length === 0 ? (
              <p className="text-sm text-muted-foreground">Your list is empty. Add an ingredient to begin.</p>
            ) : (
              <ul className="divide-y">
                {list.items.map((item) => (
                  <ShoppingItemRow
                    key={item.id}
                    listId={list.id}
                    item={item}
                    disabled={mutation.isPending}
                    onEdit={setEditor}
                    onRemove={remove}
                  />
                ))}
              </ul>
            )}
            <div className="mt-4 flex flex-wrap items-baseline justify-between gap-2 border-t pt-4">
              <p className="font-medium">Checked total: {formatMoney(totals.amount)}</p>
              {totals.missingPrices > 0 && (
                <p className="text-sm text-muted-foreground">
                  {totals.missingPrices} purchased {totals.missingPrices === 1 ? "item needs" : "items need"}{" "}
                  a price
                </p>
              )}
            </div>
            <ShoppingListActions
              listId={list.id}
              busy={mutation.isPending}
              hasCheckedItems={list.items.some((item) => item.checked)}
              onDelete={() => setDeleting(true)}
              onCheckout={openCheckout}
            />
          </SectionCard>
        </>
      )}
      <GroceryDrawer
        open={editor !== null && list !== null}
        title={editor === "new" ? "Add shopping item" : "Edit shopping item"}
        description="Choose an ingredient and quantity in its unit."
        onClose={() => setEditor(null)}
      >
        {list &&
          (editor === "new" ? (
            <ShoppingItemsBatchForm listId={list.id} onClose={() => setEditor(null)} />
          ) : (
            editor && (
              <ShoppingItemForm
                key={editor.id}
                listId={list.id}
                item={editor}
                onClose={() => setEditor(null)}
              />
            )
          ))}
      </GroceryDrawer>
      <GroceryDrawer
        open={checkout !== null}
        title="Finish shopping"
        description="Review your purchases. Completing updates your pantry and records one expense together."
        onClose={() => setCheckout(null)}
      >
        {checkout && (
          <CheckoutForm
            key={checkout.id}
            list={checkout}
            categoryId={defaultCategoryId}
            onClose={() => setCheckout(null)}
          />
        )}
      </GroceryDrawer>
      <ConfirmRemoval
        open={deleting}
        title="Delete this shopping list?"
        description="The open list and its items will be removed. Your pantry and transactions stay unchanged."
        onClose={() => setDeleting(false)}
        onConfirm={() => (list ? mutation.mutateAsync({ action: "delete", id: list.id }) : Promise.resolve())}
      />
    </div>
  );
}
