import { shoppingTotals } from "@keepitbalance/shared/groceries";
import { formatMoney } from "@/shared/lib/format";
import { ShoppingItemsBatchForm } from "./components/ShoppingItemsBatchForm.tsx";
import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { ShoppingItem, ShoppingList, CurrentShoppingList } from "@keepitbalance/shared/groceries";
import { toast } from "sonner";
import { Plus, ShoppingBasket } from "lucide-react";
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
  const purchased = list?.items.filter((item) => item.checked).length ?? 0;
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
          className="flex flex-col items-center gap-4 rounded-2xl border border-border/70 bg-card px-6 py-20 text-center sm:py-28"
        >
          <div className="mb-2 grid size-16 place-items-center rounded-2xl border border-border/60 bg-muted/50">
            <ShoppingBasket className="size-7 text-brand" strokeWidth={1.5} aria-hidden />
          </div>
          <h2 className="text-xl font-medium tracking-tight">Start your next shopping trip</h2>
          <p className="text-sm text-muted-foreground">
            Add ingredients, check off purchases and record the total when you're done.
          </p>
          <Button
            className="mt-2 rounded-full px-5"
            disabled={mutation.isPending}
            onClick={() => void start()}
          >
            {mutation.isPending ? "Creating…" : "Create shopping list"}
          </Button>
        </section>
      ) : (
        <>
          <SectionCard
            title="Your shopping list"
            description={`${purchased} of ${list.items.length} items purchased`}
            action={
              <Button className="rounded-full px-4" onClick={() => setEditor("new")}>
                <Plus className="size-4" aria-hidden /> Add item
              </Button>
            }
          >
            {list.items.length === 0 ? (
              <p className="py-14 text-center text-sm text-muted-foreground">
                Your list is empty. Add an ingredient to begin.
              </p>
            ) : (
              <>
                <div
                  className="hidden grid-cols-[minmax(0,1fr)_6rem_4.5rem] gap-3 border-b border-border/60 py-3 text-xs text-muted-foreground sm:grid sm:grid-cols-[minmax(0,1fr)_8rem_5rem] sm:gap-5"
                  aria-hidden="true"
                >
                  <span>Item</span>
                  <span className="text-right">Total price</span>
                  <span className="sr-only">Actions</span>
                </div>
                <ul className="divide-y divide-border/60">
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
              </>
            )}
            {list.items.length > 0 && (
              <div
                role="progressbar"
                aria-label="Shopping progress"
                aria-valuemin={0}
                aria-valuemax={list.items.length}
                aria-valuenow={purchased}
                className="my-5 h-1 overflow-hidden rounded-full bg-muted"
              >
                <div
                  className="h-full rounded-full bg-brand"
                  style={{ width: `${(purchased / list.items.length) * 100}%` }}
                />
              </div>
            )}
            <div className="flex flex-wrap items-baseline justify-between gap-2 pt-2">
              <p className="text-lg font-medium tracking-tight tabular-nums">
                Checked total: {formatMoney(totals.amount)}
              </p>
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
