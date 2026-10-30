import { GROCERY_BATCH_MAX } from "@keepitbalance/shared/groceries";
import { Plus, Trash2 } from "lucide-react";
import { TextField } from "@/shared/components/form/TextField";
import { SelectField } from "@/shared/components/form/SelectField";
import { Button } from "@/shared/components/ui/button";
import { GroceryForm } from "../../../shared/components/GroceryForm.tsx";
import { useIngredientsBatchForm } from "../hooks/use-ingredients-batch-form.ts";

export function IngredientsBatchForm({ onClose }: { onClose: () => void }) {
  const { form, fields, remove, addRow, error, handleSubmit } = useIngredientsBatchForm(onClose);
  const pending = form.formState.isSubmitting;
  return (
    <GroceryForm
      onSubmit={handleSubmit}
      error={error}
      pending={pending}
      onCancel={onClose}
      submitLabel={fields.length === 1 ? "Save ingredient" : "Save ingredients"}
    >
      <p className="text-sm text-muted-foreground">
        Add up to {GROCERY_BATCH_MAX} ingredients. Each name must be unique. Everything saves together.
      </p>
      <div className="rounded-lg border">
        <div
          aria-hidden="true"
          className="grid grid-cols-[minmax(0,1fr)_7.5rem_2rem] gap-2 rounded-t-lg bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground"
        >
          <span>Ingredient name</span>
          <span>Unit</span>
        </div>
        {fields.map((field, index) => (
          <fieldset
            key={field.id}
            className="grid min-w-0 grid-cols-[minmax(0,1fr)_7.5rem_2rem] items-start gap-2 border-t p-3 [&_[data-slot=field-label]]:sr-only"
          >
            <legend className="sr-only">Ingredient {index + 1}</legend>
            <TextField
              control={form.control}
              name={`ingredients.${index}.name`}
              label="Ingredient name"
              placeholder="e.g. Rice"
            />
            <SelectField
              control={form.control}
              name={`ingredients.${index}.unit`}
              label="Unit"
              placeholder="Choose a unit"
              options={[
                { value: "g", label: "Grams (g)" },
                { value: "ml", label: "Millilitres (ml)" },
                { value: "pcs", label: "Pieces (pcs)" },
              ]}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="mt-0.5 text-muted-foreground hover:text-destructive"
              disabled={pending || fields.length === 1}
              aria-label={`Remove ingredient row ${index + 1}`}
              onClick={() => remove(index)}
            >
              <Trash2 aria-hidden />
            </Button>
          </fieldset>
        ))}
        <div className="border-t p-3">
          <Button
            type="button"
            variant="outline"
            disabled={pending || fields.length >= GROCERY_BATCH_MAX}
            onClick={addRow}
          >
            <Plus aria-hidden />
            Add another ingredient
          </Button>
        </div>
      </div>
    </GroceryForm>
  );
}
