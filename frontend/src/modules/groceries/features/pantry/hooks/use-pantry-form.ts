import { zodResolver } from "@hookform/resolvers/zod";
import {
  createPantryItemSchema,
  type CreatePantryInput,
  type CreatePantryValues,
  type PantryItem,
} from "@keepitbalance/shared/groceries";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useIngredients } from "../../../shared/queries.ts";
import { usePantryMutation, groceryError } from "../../../shared/use-grocery-mutations.ts";

export function usePantryForm(item: PantryItem | undefined, onSaved: () => void) {
  const ingredients = useIngredients();
  const mutation = usePantryMutation();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<CreatePantryInput, unknown, CreatePantryValues>({
    resolver: zodResolver(createPantryItemSchema),
    defaultValues: { ingredientId: item?.ingredient.id ?? "", quantity: item?.quantity ?? "" },
  });
  const ingredientId = useWatch({ control: form.control, name: "ingredientId" });
  const unit = ingredients.find((ingredient) => ingredient.id === ingredientId)?.unit;
  async function save(values: CreatePantryValues) {
    setError(null);
    try {
      await mutation.mutateAsync(
        item
          ? {
              action: "update",
              id: item.id,
              values: { quantity: values.quantity, updatedAt: item.updatedAt },
            }
          : { action: "create", values },
      );
      onSaved();
    } catch (error) {
      setError(groceryError(error));
    }
  }
  return { form, error, unit, handleSubmit: form.handleSubmit(save) };
}
