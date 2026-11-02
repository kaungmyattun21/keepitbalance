import { useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  recipeSchema,
  type Recipe,
  type RecipeInput,
  type RecipeValues,
} from "@keepitbalance/shared/meal-planning";
import { useIngredients } from "../../../shared/queries.ts";
import { useRecipeMutation } from "../../../shared/use-planning-mutations.ts";
import { groceryError } from "../../../shared/use-grocery-mutations.ts";
export function useRecipeForm(recipe: Recipe | undefined, onSaved: () => void) {
  const ingredients = useIngredients();
  const mutation = useRecipeMutation();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<RecipeInput, unknown, RecipeValues>({
    resolver: zodResolver(recipeSchema),
    defaultValues: recipe
      ? {
          name: recipe.name,
          servings: recipe.servings,
          caloriesPerServing: recipe.caloriesPerServing,
          steps: recipe.steps,
          ingredients: recipe.ingredients.map((item) => ({
            ingredientId: item.ingredient.id,
            quantity: item.quantity,
          })),
        }
      : {
          name: "",
          servings: 2,
          caloriesPerServing: 0,
          steps: "",
          ingredients: [{ ingredientId: "", quantity: "" }],
        },
  });
  const fields = useFieldArray({ control: form.control, name: "ingredients" });
  const image = useWatch({ control: form.control, name: "image" });
  const rows = useWatch({ control: form.control, name: "ingredients" });
  const handleSubmit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      await mutation.mutateAsync({ action: "save", values, recipe });
      onSaved();
    } catch (error) {
      setError(groceryError(error));
    }
  });
  return { form, fields, rows, image, ingredients, error, handleSubmit };
}
