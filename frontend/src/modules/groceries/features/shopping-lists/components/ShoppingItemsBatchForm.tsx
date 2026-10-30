import { GROCERY_BATCH_MAX } from "@keepitbalance/shared/groceries";
import { Plus, Trash2 } from "lucide-react";
import { TextField } from "@/shared/components/form/TextField";
import { Button } from "@/shared/components/ui/button";
import { GroceryForm } from "../../../shared/components/GroceryForm.tsx";
import { IngredientPicker } from "../../../shared/components/IngredientPicker.tsx";
import { useShoppingBatchForm } from "../hooks/use-shopping-batch-form.ts";

export function ShoppingItemsBatchForm({ listId, onClose }: { listId: string; onClose: () => void }) {
  const { form, fields, rows, ingredients, remove, addRow, error, handleSubmit } = useShoppingBatchForm(
    listId,
    onClose,
  );
  const pending = form.formState.isSubmitting;
  return (
    <GroceryForm
      onSubmit={handleSubmit}
      error={error}
      pending={pending}
      onCancel={onClose}
      submitLabel={fields.length === 1 ? "Save item" : "Save items"}
    >
      <p className="text-sm text-muted-foreground">
        Add up to {GROCERY_BATCH_MAX} items and save together. Repeated ingredients combine quantities and are
        marked as not purchased for review.
      </p>
      <div className="rounded-lg border">
        <div
          aria-hidden="true"
          className="grid grid-cols-[minmax(0,1fr)_5.5rem_2rem] gap-2 rounded-t-lg bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground"
        >
          <span>Ingredient</span>
          <span>Quantity</span>
        </div>
        {fields.map((field, index) => {
          const unit = ingredients.find((ingredient) => ingredient.id === rows[index]?.ingredientId)?.unit;
          return (
            <fieldset
              key={field.id}
              className="grid min-w-0 grid-cols-[minmax(0,1fr)_5.5rem_2rem] items-start gap-2 border-t p-3 [&_[data-slot=field-label]]:sr-only"
            >
              <legend className="sr-only">Item {index + 1}</legend>
              <IngredientPicker
                compact
                control={form.control}
                name={`items.${index}.ingredientId`}
                onCreated={(ingredient) =>
                  form.setValue(`items.${index}.ingredientId`, ingredient.id, { shouldDirty: true })
                }
              />
              <div className="min-w-0">
                <TextField
                  control={form.control}
                  name={`items.${index}.quantity`}
                  label={unit ? `Quantity (${unit})` : "Quantity"}
                  inputMode="decimal"
                  placeholder="0.00"
                />
                {unit && <p className="mt-1 text-right text-xs text-muted-foreground">{unit}</p>}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="mt-0.5 text-muted-foreground hover:text-destructive"
                disabled={pending || fields.length === 1}
                aria-label={`Remove item row ${index + 1}`}
                onClick={() => remove(index)}
              >
                <Trash2 aria-hidden />
              </Button>
            </fieldset>
          );
        })}
        <div className="border-t p-3">
          <Button
            type="button"
            variant="outline"
            disabled={pending || fields.length >= GROCERY_BATCH_MAX}
            onClick={addRow}
          >
            <Plus aria-hidden />
            Add another item
          </Button>
        </div>
      </div>
    </GroceryForm>
  );
}
