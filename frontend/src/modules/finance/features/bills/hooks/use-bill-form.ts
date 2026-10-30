import { zodResolver } from "@hookform/resolvers/zod";
import { createBillSchema, type CreateBillInput, type CreateBillValues } from "@keepitbalance/shared/finance";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { ApiError } from "@/shared/lib/api";
import { financeKeys } from "../../../shared/query-keys.ts";
import type { BillFormOptions } from "../types.ts";
import { useSaveBill } from "./use-bill-mutations.ts";

export function useBillForm({ bill, groups, today, onSaved }: BillFormOptions) {
  const queryClient = useQueryClient();
  const saveBill = useSaveBill();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<CreateBillInput, unknown, CreateBillValues>({
    resolver: zodResolver(createBillSchema),
    defaultValues: bill
      ? {
          name: bill.name,
          amount: bill.amount,
          categoryId: bill.category.id,
          frequency: bill.frequency,
          nextDueDate: bill.nextDueDate,
        }
      : { name: "", amount: "", categoryId: "", frequency: "monthly", nextDueDate: today },
  });
  const categoryOptions = groups
    .filter((group) => group.type === "expense")
    .flatMap((group) =>
      group.categories.map((category) => ({ value: category.id, label: category.name, group: group.name })),
    );

  async function save(values: CreateBillValues) {
    setFormError(null);
    try {
      await saveBill.mutateAsync(
        bill ? { id: bill.id, values: { ...values, updatedAt: bill.updatedAt } } : { values },
      );
      toast.success(bill ? "Bill updated." : "Bill created.");
      onSaved();
    } catch (error) {
      if (error instanceof ApiError) {
        for (const issue of error.validationIssues) {
          if (issue.location === "body" && issue.path in createBillSchema.shape)
            form.setError(issue.path as keyof CreateBillInput, { message: issue.message });
        }
        if (["BILL_CHANGED", "NOT_FOUND", "CATEGORY_TYPE_MISMATCH"].includes(error.code))
          void queryClient.invalidateQueries({ queryKey: financeKeys.all });
      }
      setFormError(error instanceof ApiError ? error.message : "Something went wrong. Please try again.");
    }
  }
  return { form, formError, categoryOptions, handleSubmit: form.handleSubmit(save) };
}
