import { zodResolver } from "@hookform/resolvers/zod";
import {
  createIngredientSchema,
  type IngredientInput,
  type Ingredient,
} from "@keepitbalance/shared/groceries";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useIngredientMutation, groceryError } from "../../../shared/use-grocery-mutations.ts";

export function useIngredientForm(
  ingredient: Ingredient | undefined,
  onSaved: (ingredient: Ingredient) => void,
) {
  const mutation = useIngredientMutation();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<IngredientInput>({
    resolver: zodResolver(createIngredientSchema),
    defaultValues: {
      name: ingredient?.name ?? "",
      unit: ingredient?.unit === "ml" || ingredient?.unit === "pcs" ? ingredient.unit : "g",
    },
  });
  async function save(values: IngredientInput) {
    setError(null);
    try {
      const saved = await mutation.mutateAsync({ id: ingredient?.id, values });
      if (saved) onSaved(saved);
    } catch (error) {
      setError(groceryError(error));
    }
  }
  return { form, error, handleSubmit: form.handleSubmit(save) };
}
