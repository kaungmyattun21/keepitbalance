import { zodResolver } from "@hookform/resolvers/zod";
import {
  createShoppingItemSchema,
  type ShoppingItemInput,
  type ShoppingItemValues,
  type ShoppingItem,
} from "@keepitbalance/shared/groceries";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useIngredients } from "../../../shared/queries.ts";
import { useShoppingMutation, groceryError } from "../../../shared/use-grocery-mutations.ts";

export function useShoppingItemForm(listId: string, item: ShoppingItem | undefined, onSaved: () => void) {
  const ingredients = useIngredients();
  const mutation = useShoppingMutation();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<ShoppingItemInput, unknown, ShoppingItemValues>({
    resolver: zodResolver(createShoppingItemSchema),
    defaultValues: { ingredientId: item?.ingredient.id ?? "", quantity: item?.quantity ?? "" },
  });
  const ingredientId = useWatch({ control: form.control, name: "ingredientId" });
  const unit = ingredients.find((ingredient) => ingredient.id === ingredientId)?.unit;
  async function save(values: ShoppingItemValues) {
    setError(null);
    try {
      await mutation.mutateAsync(
        item
          ? { action: "update", id: listId, itemId: item.id, values: { quantity: values.quantity } }
          : { action: "add", id: listId, values },
      );
      onSaved();
    } catch (error) {
      setError(groceryError(error));
    }
  }
  return { form, error, unit, handleSubmit: form.handleSubmit(save) };
}
