import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  shoppingPriceFormSchema,
  type ShoppingItem,
  type ShoppingPriceInput,
  type ShoppingPriceValues,
} from "@keepitbalance/shared/groceries";
import { groceryError } from "../../../shared/use-grocery-mutations.ts";
import { useUpdateShoppingItem } from "./use-update-shopping-item.ts";

export function useShoppingPriceForm(listId: string, item: ShoppingItem, disabled: boolean) {
  const mutation = useUpdateShoppingItem(listId);
  const form = useForm<ShoppingPriceInput, unknown, ShoppingPriceValues>({
    resolver: zodResolver(shoppingPriceFormSchema),
    defaultValues: { price: item.price ?? "" },
  });
  const {
    reset,
    formState: { isDirty, isSubmitting, errors },
  } = form;
  const pending = mutation.isPending;
  useEffect(() => {
    // Refresh untouched fields, but retain unsaved edits and failed-save drafts.
    if (!isDirty && !isSubmitting && !pending && !errors.root) {
      reset({ price: item.price ?? "" });
    }
  }, [item.price, isDirty, isSubmitting, pending, errors.root, reset]);
  const save = form.handleSubmit(async ({ price }) => {
    if (disabled || mutation.isPending || price === item.price) return;
    form.clearErrors("root");
    try {
      await mutation.mutateAsync({ itemId: item.id, price });
      form.reset({ price: price ?? "" });
    } catch (error) {
      form.setError("root", { message: groceryError(error) });
    }
  });
  return { form, save, pending: mutation.isPending };
}
