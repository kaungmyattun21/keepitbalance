import { zodResolver } from "@hookform/resolvers/zod";
import {
  createTransactionSchema,
  type CreateTransactionInput,
  type CreateTransactionValues,
  type Transaction,
  type TransactionType,
} from "@keepitbalance/shared/finance";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { ApiError } from "@/shared/lib/api";
import { formatMoney } from "@/shared/lib/format";
import { useCategoryGroups } from "../../../shared/hooks/use-category-groups.ts";
import { financeKeys } from "../../../shared/query-keys.ts";
import type { TransactionFormField, TransactionFormOptions } from "../types.ts";
import { useCreateTransaction } from "./use-create-transaction.ts";
import { useUpdateTransaction } from "./use-update-transaction.ts";

const isTransactionFormField = (path: string): path is TransactionFormField =>
  path in createTransactionSchema.shape;

function emptyFormValues(today: string): CreateTransactionInput {
  return { type: "expense", amount: "", date: today, categoryId: "", note: "" };
}

function formValuesOf(transaction: Transaction): CreateTransactionInput {
  return {
    type: transaction.type,
    amount: transaction.amount,
    date: transaction.date,
    categoryId: transaction.category.id,
    note: transaction.note ?? "",
  };
}

function describeTransaction(transaction: Transaction): string {
  const typeLabel = transaction.type === "income" ? "Income" : "Expense";
  return `${typeLabel} of ${formatMoney(transaction.amount)}`;
}

export function useTransactionForm({ categories, today, transaction, onSaved }: TransactionFormOptions) {
  const queryClient = useQueryClient();
  const createTransaction = useCreateTransaction();
  const updateTransaction = useUpdateTransaction();
  const [formError, setFormError] = useState<string | null>(null);
  const isEditing = transaction !== undefined;
  const isShoppingExpense = Boolean(transaction?.shoppingListId);

  const form = useForm<CreateTransactionInput, unknown, CreateTransactionValues>({
    resolver: zodResolver(createTransactionSchema),
    defaultValues: transaction ? formValuesOf(transaction) : emptyFormValues(today),
  });

  const groups = useCategoryGroups();
  const selectedType = useWatch({ control: form.control, name: "type" });
  const categoryOptions = categories
    .filter((category) => category.type === selectedType)
    .map((category) => ({
      value: category.id,
      label: category.name,
      group: groups.find((group) => group.id === category.groupId)?.name,
    }));

  function changeType(nextType: TransactionType) {
    form.setValue("type", nextType);
    form.setValue("categoryId", "");
  }

  async function submitTransaction(values: CreateTransactionValues) {
    setFormError(null);
    try {
      if (transaction) {
        const saved = await updateTransaction.mutateAsync({ id: transaction.id, values });
        toast.success(`${describeTransaction(saved)} updated.`);
        onSaved?.();
        return;
      }
      const saved = await createTransaction.mutateAsync(values);
      toast.success(`${describeTransaction(saved)} added to ${saved.category.name}.`);
      form.reset({ ...values, amount: "", note: "" });
      onSaved?.();
    } catch (error) {
      showServerError(error);
    }
  }

  function showServerError(error: unknown) {
    if (!(error instanceof ApiError)) {
      setFormError("Something went wrong. Please try again.");
      return;
    }

    if (error.code === "NOT_FOUND") {
      void queryClient.invalidateQueries({ queryKey: financeKeys.all });
      if (isEditing) {
        setFormError(
          "This transaction or its category was deleted. Close this dialog to see the latest list.",
        );
      } else {
        form.setError("categoryId", { message: "This category no longer exists. Choose another one." });
      }
      return;
    }

    if (error.code === "CATEGORY_TYPE_MISMATCH") {
      form.setError("categoryId", { message: `Choose an ${selectedType} category.` });
      return;
    }

    const fieldIssues = error.validationIssues.filter(
      (issue) => issue.location === "body" && isTransactionFormField(issue.path),
    );
    if (fieldIssues.length === 0) {
      setFormError(error.message);
      return;
    }
    for (const issue of fieldIssues) {
      form.setError(issue.path as TransactionFormField, { message: issue.message });
    }
  }

  return {
    form,
    formError,
    isEditing,
    isShoppingExpense,
    selectedType,
    categoryOptions,
    changeType,
    handleSubmit: form.handleSubmit(submitTransaction),
  };
}
