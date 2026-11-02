import { useState } from "react";
import { RecipeImageField } from "./RecipeImageField.tsx";
import type { Recipe } from "@keepitbalance/shared/meal-planning";
import { Plus, X } from "lucide-react";
import { TextField } from "@/shared/components/form/TextField";
import { TextareaField } from "@/shared/components/form/TextareaField";
import { Button } from "@/shared/components/ui/button";
import { GroceryForm } from "../../../shared/components/GroceryForm.tsx";
import { IngredientPicker } from "../../../shared/components/IngredientPicker.tsx";
import { useRecipeForm } from "../hooks/use-recipe-form.ts";
export function RecipeForm({ recipe, onClose }: { recipe?: Recipe; onClose: () => void }) {
  const { form, fields, rows, image, ingredients, error, handleSubmit } = useRecipeForm(recipe, onClose);
  const [readingImage, setReadingImage] = useState(false);
  const pending = form.formState.isSubmitting || readingImage;
  return (
    <GroceryForm
      error={error}
      pending={pending}
      onSubmit={(event) => (readingImage ? event.preventDefault() : handleSubmit(event))}
      onCancel={onClose}
      submitLabel="Save recipe"
    >
      <TextField control={form.control} name="name" label="Recipe name" placeholder="e.g. Vegetable rice" />
      <RecipeImageField
        value={image}
        existingUrl={recipe?.imageUrl}
        disabled={pending}
        onReadingChange={setReadingImage}
        onChange={(value) => form.setValue("image", value, { shouldDirty: true, shouldValidate: true })}
      />
      <div className="grid min-w-0 grid-cols-2 gap-3">
        <TextField control={form.control} name="servings" label="Base servings" inputMode="numeric" />
        <TextField
          control={form.control}
          name="caloriesPerServing"
          label="Calories per serving"
          inputMode="numeric"
          description="kcal. Enter 0 if unknown."
        />
      </div>
      <div>
        <p className="mb-2 text-sm font-medium">Ingredients for the full recipe</p>
        <div className="rounded-xl border border-border/60">
          {fields.fields.map((field, index) => {
            const unit = ingredients.find((ingredient) => ingredient.id === rows[index]?.ingredientId)?.unit;
            return (
              <fieldset
                key={field.id}
                className="grid min-w-0 grid-cols-[minmax(0,1fr)_5rem_2rem] gap-2 border-b border-border/60 p-3 [&_[data-slot=field-label]]:sr-only"
              >
                <legend className="sr-only">Recipe ingredient {index + 1}</legend>
                <IngredientPicker
                  compact
                  control={form.control}
                  name={`ingredients.${index}.ingredientId`}
                  onCreated={(ingredient) =>
                    form.setValue(`ingredients.${index}.ingredientId`, ingredient.id, { shouldDirty: true })
                  }
                />
                <div className="min-w-0">
                  <TextField
                    control={form.control}
                    name={`ingredients.${index}.quantity`}
                    label={unit ? `Quantity (${unit})` : "Quantity"}
                    inputMode="decimal"
                    placeholder="0.00"
                  />
                  {unit && <p className="mt-1 text-right text-xs text-muted-foreground">{unit}</p>}
                </div>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  disabled={pending || fields.fields.length === 1}
                  aria-label={`Remove recipe ingredient ${index + 1}`}
                  onClick={() => fields.remove(index)}
                >
                  <X aria-hidden />
                </Button>
              </fieldset>
            );
          })}
          <div className="p-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pending || fields.fields.length >= 50}
              onClick={() => fields.append({ ingredientId: "", quantity: "" })}
            >
              <Plus aria-hidden />
              Add ingredient row
            </Button>
          </div>
        </div>
        {(form.formState.errors.ingredients?.message || form.formState.errors.ingredients?.root?.message) && (
          <p role="alert" className="mt-2 text-sm text-destructive">
            {form.formState.errors.ingredients?.message ?? form.formState.errors.ingredients?.root?.message}
          </p>
        )}
      </div>
      <TextareaField
        control={form.control}
        name="steps"
        label="Instructions"
        maxLength={10000}
        description="One step per line works well."
      />
    </GroceryForm>
  );
}
