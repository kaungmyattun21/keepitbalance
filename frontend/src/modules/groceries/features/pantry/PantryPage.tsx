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
        description="Track current stock. Purchased items are added here when you finish shopping."
        action={<Button onClick={() => setEditor("new")}>Add pantry item</Button>}
      >
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Your pantry is empty. Add what you already have, or finish a shopping list to stock it.
          </p>
        ) : (
          <ul className="divide-y">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex flex-col justify-between gap-3 py-4 sm:flex-row sm:items-center"
              >
                <div>
                  <h3 className="font-medium">{item.ingredient.name}</h3>
                  <p
                    className={
                      item.quantity === "0.00" ? "text-sm text-destructive" : "text-sm text-muted-foreground"
                    }
                  >
                    {item.quantity === "0.00" ? "Out of stock" : `${item.quantity} ${item.ingredient.unit}`}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    aria-label={`Adjust ${item.ingredient.name}`}
                    onClick={() => setAdjusting(item)}
                  >
                    Adjust stock
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={`Edit ${item.ingredient.name}`}
                    onClick={() => setEditor(item)}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={`Remove ${item.ingredient.name}`}
                    onClick={() => setRemoving(item)}
                  >
                    Remove
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
