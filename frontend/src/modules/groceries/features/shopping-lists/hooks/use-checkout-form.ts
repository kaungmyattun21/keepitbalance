import { zodResolver } from "@hookform/resolvers/zod";
import {
  completeShoppingListSchema,
  shoppingTotals,
  type ShoppingList,
  type CompleteShoppingInput,
  type CompleteShoppingValues,
} from "@keepitbalance/shared/groceries";
import { todayIn } from "@keepitbalance/shared/dates";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { useCurrentUser } from "@/modules/auth";
import { useCategoryGroups } from "@/modules/finance";
import { useShoppingMutation, groceryError } from "../../../shared/use-grocery-mutations.ts";

export function useCheckoutForm(list: ShoppingList, categoryId: string | null, onSaved: () => void) {
  const user = useCurrentUser();
  const groups = useCategoryGroups();
  const mutation = useShoppingMutation();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<CompleteShoppingInput, unknown, CompleteShoppingValues>({
    resolver: zodResolver(completeShoppingListSchema),
    defaultValues: {
      amount: list.items.some((item) => item.checked && item.price !== null)
        ? shoppingTotals(list.items).amount
        : "",
      date: todayIn(user.timezone ?? "UTC"),
      categoryId: categoryId ?? "",
      updatedAt: list.updatedAt,
    },
  });
  const categoryOptions = groups
    .filter((group) => group.type === "expense")
    .flatMap((group) =>
      group.categories.map((category) => ({ value: category.id, label: category.name, group: group.name })),
    );
  async function save(values: CompleteShoppingValues) {
    setError(null);
    try {
      await mutation.mutateAsync({ action: "complete", id: list.id, values });
      toast.success("Shopping completed. Pantry updated and expense recorded.");
      onSaved();
      await navigate("/meals/history");
    } catch (error) {
      setError(groceryError(error));
    }
  }
  return { form, error, categoryOptions, handleSubmit: form.handleSubmit(save) };
}
