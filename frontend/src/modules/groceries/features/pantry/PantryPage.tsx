import { Package, Pencil, Plus, SlidersHorizontal, X } from "lucide-react";
import { useState } from "react";
import type { PantryItem } from "@keepitbalance/shared/groceries";
import { DocumentTitle } from "@/shared/components/DocumentTitle";
import { Button } from "@/shared/components/ui/button";
import { SectionCard } from "@/shared/components/SectionCard";
import { usePantry } from "../../shared/queries.ts";
import { usePantryMutation } from "../../shared/use-grocery-mutations.ts";
import { GroceryDrawer } from "../../shared/components/GroceryDrawer.tsx";
import { ConfirmRemoval } from "../../shared/components/ConfirmRemoval.tsx";
import { PantryForm } from "./components/PantryForm.tsx";
import { AdjustStockForm } from "./components/AdjustStockForm.tsx";

export function PantryPage() {
  const items = usePantry();
  const mutation = usePantryMutation();
  const [editor, setEditor] = useState<PantryItem | "new" | null>(null);
  const [adjusting, setAdjusting] = useState<PantryItem | null>(null);
  const [removing, setRemoving] = useState<PantryItem | null>(null);
  return (
    <div className="flex w-full flex-col gap-5">
      <DocumentTitle title="Pantry" />
      <SectionCard
        title="Your pantry"
        description="A clear view of what you have on hand."
        action={
          <Button className="rounded-full px-4" onClick={() => setEditor("new")}>
            <Plus className="size-4" aria-hidden />
            Add pantry item
          </Button>
        }
      >
        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-14 text-center">
            <Package className="mb-1 size-8 text-muted-foreground" strokeWidth={1.5} aria-hidden />
            <p className="max-w-sm text-sm text-muted-foreground">
              Your pantry is empty. Add what you already have, or finish a shopping list to stock it.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border/60">
            {items.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-5">
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-medium wrap-break-word">{item.ingredient.name}</h3>
                  <p
                    className={
                      item.quantity === "0.00"
                        ? "mt-1 text-xs text-destructive"
                        : "mt-1 text-xs text-muted-foreground tabular-nums"
                    }
                  >
                    {item.quantity === "0.00" ? "Out of stock" : `${item.quantity} ${item.ingredient.unit}`}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="rounded-full text-muted-foreground hover:text-foreground"
                    aria-label={`Adjust ${item.ingredient.name}`}
                    onClick={() => setAdjusting(item)}
                  >
                    <SlidersHorizontal className="size-3.5" aria-hidden />
                    Adjust stock
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    className="rounded-full text-muted-foreground hover:text-foreground"
                    title="Edit stock"
                    aria-label={`Edit ${item.ingredient.name}`}
                    onClick={() => setEditor(item)}
                  >
                    <Pencil className="size-3.5" aria-hidden />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    className="rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    title="Remove from pantry"
                    aria-label={`Remove ${item.ingredient.name}`}
                    onClick={() => setRemoving(item)}
                  >
                    <X className="size-4" aria-hidden />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
      <GroceryDrawer
        open={editor !== null}
        title={editor === "new" ? "Add pantry item" : "Edit pantry item"}
        description="Quantities use the ingredient's unit. Use Adjust stock to add purchases or record consumption."
        onClose={() => setEditor(null)}
      >
        {editor !== null && (
          <PantryForm
            key={editor === "new" ? "new" : editor.id}
            item={editor === "new" ? undefined : editor}
            onClose={() => setEditor(null)}
          />
        )}
      </GroceryDrawer>
      <GroceryDrawer
        open={adjusting !== null}
        title={`Adjust ${adjusting?.ingredient.name ?? "stock"}`}
        description="Add stock or subtract what you used."
        onClose={() => setAdjusting(null)}
      >
        {adjusting && (
          <AdjustStockForm key={adjusting.id} item={adjusting} onClose={() => setAdjusting(null)} />
        )}
      </GroceryDrawer>
      <ConfirmRemoval
        open={removing !== null}
        title="Remove this pantry item?"
        description={`${removing?.ingredient.name ?? "This item"} will be removed from your pantry. The ingredient remains available.`}
        onClose={() => setRemoving(null)}
        onConfirm={() =>
          removing ? mutation.mutateAsync({ action: "delete", id: removing.id }) : Promise.resolve()
        }
      />
    </div>
  );
}
