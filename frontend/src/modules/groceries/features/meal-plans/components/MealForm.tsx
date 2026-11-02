import type { MealPlanEntry, MealSlot } from "@keepitbalance/shared/meal-planning";
import { TextField } from "@/shared/components/form/TextField";
import { SelectField } from "@/shared/components/form/SelectField";
import { GroceryForm } from "../../../shared/components/GroceryForm.tsx";
import { useMealForm } from "../hooks/use-meal-form.ts";
export function MealForm({
  date,
  slot,
  meal,
  onClose,
  busy = false,
}: {
  date: string;
  slot: MealSlot;
  meal?: MealPlanEntry;
  onClose: () => void;
  busy?: boolean;
}) {
  const { form, recipes, recipe, servings, error, handleSubmit } = useMealForm(date, slot, meal, onClose);
  return (
    <GroceryForm
      onSubmit={handleSubmit}
      error={error}
      pending={form.formState.isSubmitting || busy}
      onCancel={onClose}
      submitLabel="Save meal"
    >
      <SelectField
        control={form.control}
        name="recipeId"
        label="Recipe"
        placeholder="Choose a recipe"
        options={recipes.map((entry) => ({ value: entry.id, label: entry.name }))}
      />
      <TextField control={form.control} name="date" label="Meal date" type="date" />
      <SelectField
        control={form.control}
        name="slot"
        label="Meal time"
        placeholder="Choose a meal time"
        options={["breakfast", "lunch", "dinner", "snack"].map((value) => ({
          value,
          label: value[0]!.toUpperCase() + value.slice(1),
        }))}
      />
      <TextField
        control={form.control}
        name="servings"
        label="Planned servings"
        inputMode="numeric"
        description="Ingredient quantities scale from the recipe's base servings."
      />
      {recipe && Number(servings) > 0 && Number(servings) <= 1000 && (
        <p className="rounded-xl bg-muted/40 p-4 text-sm text-muted-foreground">
          {recipe.caloriesPerServing * Number(servings)} kcal planned · recipe makes {recipe.servings}{" "}
          servings.
        </p>
      )}
      {meal && (
        <p className="text-xs text-muted-foreground">
          Marking a meal eaten leaves pantry stock unchanged. Adjust stock in your pantry when needed.
        </p>
      )}
    </GroceryForm>
  );
}
