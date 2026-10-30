import type { PantryItem } from "@keepitbalance/shared/groceries";
import { TextField } from "@/shared/components/form/TextField";
import { GroceryForm } from "../../../shared/components/GroceryForm.tsx";
import { IngredientPicker } from "../../../shared/components/IngredientPicker.tsx";
import { usePantryForm } from "../hooks/use-pantry-form.ts";

export function PantryForm({ item, onClose }: { item?: PantryItem; onClose: () => void }) {
  const { form, error, unit, handleSubmit } = usePantryForm(item, onClose);
  return (
    <GroceryForm
      error={error}
      onSubmit={handleSubmit}
      pending={form.formState.isSubmitting}
      onCancel={onClose}
      submitLabel="Save pantry item"
    >
      <div className="rounded-lg border">
        <div
          aria-hidden="true"
          className="grid grid-cols-[minmax(0,1fr)_6rem] gap-3 rounded-t-lg bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground"
        >
          <span>Ingredient</span>
          <span>Quantity</span>
        </div>
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_6rem] items-start gap-3 border-t p-3 [&_[data-slot=field-label]]:sr-only">
          {item ? (
            <p className="flex min-h-9 min-w-0 items-center text-sm font-medium">
              {item.ingredient.name} ({item.ingredient.unit})
            </p>
          ) : (
            <IngredientPicker
              compact
              control={form.control}
              name="ingredientId"
              onCreated={(ingredient) => form.setValue("ingredientId", ingredient.id)}
            />
          )}
          <div className="min-w-0">
            <TextField
              control={form.control}
              name="quantity"
              label={unit ? `Quantity (${unit})` : "Quantity"}
              inputMode="decimal"
              placeholder="0.00"
            />
            {unit && <p className="mt-1 text-right text-xs text-muted-foreground">{unit}</p>}
          </div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Enter your current stock. Zero means out of stock.</p>
    </GroceryForm>
  );
}
