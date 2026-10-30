import { zodResolver } from "@hookform/resolvers/zod";
import { payBillSchema, type PayBillInput, type PayBillValues } from "@keepitbalance/shared/finance";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { ApiError } from "@/shared/lib/api";
import { financeKeys } from "../../../shared/query-keys.ts";
import type { PayBillFormOptions } from "../types.ts";
import { usePayBill } from "./use-bill-mutations.ts";

export function usePayBillForm({ bill, today, onSaved }: PayBillFormOptions) {
  const queryClient = useQueryClient();
  const payBill = usePayBill();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<PayBillInput, unknown, PayBillValues>({
    resolver: zodResolver(payBillSchema),
    defaultValues: { amount: bill.amount, date: today, dueDate: bill.nextDueDate, updatedAt: bill.updatedAt },
  });
  async function save(values: PayBillValues) {
    setFormError(null);
    try {
      await payBill.mutateAsync({ id: bill.id, values });
      toast.success("Bill paid. Expense recorded.");
      onSaved();
    } catch (error) {
      if (error instanceof ApiError && ["BILL_CHANGED", "NOT_FOUND"].includes(error.code))
        void queryClient.invalidateQueries({ queryKey: financeKeys.bills() });
      setFormError(error instanceof ApiError ? error.message : "Something went wrong. Please try again.");
    }
  }
  return { form, formError, handleSubmit: form.handleSubmit(save) };
}
