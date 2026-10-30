import { zodResolver } from "@hookform/resolvers/zod";
import {
  createIngredientsBatchSchema,
  GROCERY_BATCH_MAX,
  type IngredientsBatchInput,
  type IngredientsBatchValues,
} from "@keepitbalance/shared/groceries";
import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { useIngredientsBatchMutation, groceryError } from "../../../shared/use-grocery-mutations.ts";

export function useIngredientsBatchForm(onSaved: () => void) {
  const mutation = useIngredientsBatchMutation();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<IngredientsBatchInput, unknown, IngredientsBatchValues>({
    resolver: zodResolver(createIngredientsBatchSchema),
    defaultValues: { ingredients: [{ name: "", unit: "g" }] },
  });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "ingredients" });
  async function save(values: IngredientsBatchValues) {
    setError(null);
    try {
      await mutation.mutateAsync(values);
      onSaved();
    } catch (error) {
      setError(groceryError(error));
    }
  }
  return {
    form,
    fields,
    remove,
    addRow: () => {
      if (fields.length < GROCERY_BATCH_MAX) append({ name: "", unit: "g" });
    },
    error,
    handleSubmit: form.handleSubmit(save),
  };
}
