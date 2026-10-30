import { zodResolver } from "@hookform/resolvers/zod";
import {
  createShoppingItemsBatchSchema,
  GROCERY_BATCH_MAX,
  type ShoppingItemsBatchInput,
  type ShoppingItemsBatchValues,
} from "@keepitbalance/shared/groceries";
import { useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { useShoppingMutation, groceryError } from "../../../shared/use-grocery-mutations.ts";
import { useIngredients } from "../../../shared/queries.ts";

export function useShoppingBatchForm(listId: string, onSaved: () => void) {
  const ingredients = useIngredients();
  const mutation = useShoppingMutation();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<ShoppingItemsBatchInput, unknown, ShoppingItemsBatchValues>({
    resolver: zodResolver(createShoppingItemsBatchSchema),
    defaultValues: { items: [{ ingredientId: "", quantity: "" }] },
  });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" });
  const rows = useWatch({ control: form.control, name: "items" });
  async function save(values: ShoppingItemsBatchValues) {
    setError(null);
    try {
      await mutation.mutateAsync({ action: "addBatch", id: listId, values });
      onSaved();
    } catch (error) {
      setError(groceryError(error));
    }
  }
  return {
    form,
    fields,
    rows,
    ingredients,
    remove,
    addRow: () => {
      if (fields.length < GROCERY_BATCH_MAX) append({ ingredientId: "", quantity: "" });
    },
    error,
    handleSubmit: form.handleSubmit(save),
  };
}
