import type { Ingredient } from "@keepitbalance/shared/groceries";
import { TextField } from "@/shared/components/form/TextField";
import { SelectField } from "@/shared/components/form/SelectField";
import { GroceryForm } from "../../../shared/components/GroceryForm.tsx";
import { useIngredientForm } from "../hooks/use-ingredient-form.ts";

export function IngredientForm({
  ingredient,
  onSaved,
  onCancel,
}: {
  ingredient?: Ingredient;
  onSaved: (ingredient: Ingredient) => void;
  onCancel: () => void;
}) {
  const { form, error, handleSubmit } = useIngredientForm(ingredient, onSaved);
  return (
    <GroceryForm
      onSubmit={handleSubmit}
      error={error}
      pending={form.formState.isSubmitting}
      onCancel={onCancel}
      submitLabel="Save ingredient"
    >
      <TextField control={form.control} name="name" label="Ingredient name" placeholder="e.g. Rice" />
      <SelectField
        control={form.control}
        name="unit"
        label="Unit"
        placeholder="Choose a unit"
        disabled={ingredient?.inUse}
        options={[
          { value: "g", label: "Grams (g)" },
          { value: "ml", label: "Millilitres (ml)" },
          { value: "pcs", label: "Pieces (pcs)" },
        ]}
        description={
          ingredient?.inUse
            ? "This unit is locked because the ingredient is in use."
            : "Use this same unit in your pantry and shopping list. For 1 kg, enter 1000 g."
        }
      />
    </GroceryForm>
  );
}
