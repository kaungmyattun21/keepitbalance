import { zodResolver } from "@hookform/resolvers/zod";
import {
  adjustPantryItemSchema,
  type PantryItem,
  type AdjustPantryValues,
} from "@keepitbalance/shared/groceries";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { usePantryMutation, groceryError } from "../../../shared/use-grocery-mutations.ts";

export function useAdjustStockForm(item: PantryItem, onSaved: () => void) {
  const mutation = usePantryMutation();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<{ direction: "add" | "remove"; quantity: string }, unknown, AdjustPantryValues>({
    resolver: zodResolver(adjustPantryItemSchema),
    defaultValues: { direction: "remove", quantity: "" },
  });
  async function save(values: AdjustPantryValues) {
    setError(null);
    try {
      await mutation.mutateAsync({ action: "adjust", id: item.id, values });
      onSaved();
    } catch (error) {
      setError(groceryError(error));
    }
  }
  return { form, error, handleSubmit: form.handleSubmit(save) };
}
