import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  mealSchema,
  type MealInput,
  type MealValues,
  type MealPlanEntry,
  type MealSlot,
} from "@keepitbalance/shared/meal-planning";
import { useRecipes } from "../../../shared/planning-queries.ts";
import { useMealMutation } from "../../../shared/use-planning-mutations.ts";
import { groceryError } from "../../../shared/use-grocery-mutations.ts";
export function useMealForm(
  date: string,
  slot: MealSlot,
  meal: MealPlanEntry | undefined,
  onSaved: () => void,
) {
  const recipes = useRecipes();
  const mutation = useMealMutation();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<MealInput, unknown, MealValues>({
    resolver: zodResolver(mealSchema),
    defaultValues: {
      date: meal?.date ?? date,
      slot: meal?.slot ?? slot,
      recipeId: meal?.recipe.id ?? "",
      servings: meal?.servings ?? 1,
      eaten: meal?.eaten ?? false,
    },
  });
  const recipeId = useWatch({ control: form.control, name: "recipeId" });
  const servings = useWatch({ control: form.control, name: "servings" });
  const recipe = recipes.find((entry) => entry.id === recipeId);
  const handleSubmit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      await mutation.mutateAsync({ action: "save", values, meal });
      onSaved();
    } catch (error) {
      setError(groceryError(error));
    }
  });
  return { form, recipes, recipe, servings, error, handleSubmit };
}
