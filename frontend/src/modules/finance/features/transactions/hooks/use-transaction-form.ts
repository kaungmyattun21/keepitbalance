import { CategoryIcon } from "../../../shared/components/CategoryIcon";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createTransactionSchema,
  type CreateTransactionInput,
  type CreateTransactionValues,
  type Transaction,
  type TransactionType,
} from "@keepitbalance/shared/finance";
import { useQueryClient } from "@tanstack/react-query";
import { createElement, useState } from "react";
import { useForm, useFormState, useWatch } from "react-hook-form";
import type { ReceiptDraft } from "@keepitbalance/shared/receipts";
import { parseQuickEntry, type QuickEntry } from "@keepitbalance/shared/quick-entry";
import { toast } from "sonner";
import { ApiError } from "@/shared/lib/api";
import { formatMoney } from "@/shared/lib/format";
import { useCategoryGroups } from "../../../shared/hooks/use-category-groups.ts";
import { financeKeys } from "../../../shared/query-keys.ts";
import type { TransactionFormField, TransactionFormOptions } from "../types.ts";
import { useCategorySuggestion } from "./use-category-suggestion.ts";
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
    receiptId: transaction.receipt?.id,
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
  const [receiptUploading, setReceiptUploading] = useState(false);
  const isEditing = transaction !== undefined;
  const isShoppingExpense = Boolean(transaction?.shoppingListId);

  const form = useForm<CreateTransactionInput, unknown, CreateTransactionValues>({
    resolver: zodResolver(createTransactionSchema),
    defaultValues: transaction ? formValuesOf(transaction) : emptyFormValues(today),
  });

  // Subscribes to dirty state so getFieldState can tell user edits from spoken ones.
  useFormState({ control: form.control, name: ["type", "amount", "date", "categoryId", "note"] });
  const suggestCategory = useCategorySuggestion();
  const groups = useCategoryGroups();
  const selectedType = useWatch({ control: form.control, name: "type" });
  const receiptId = useWatch({ control: form.control, name: "receiptId" });
  const categoryOptions = categories
    .filter((category) => category.type === selectedType)
    .map((category) => ({
      value: category.id,
      label: category.name,
      icon: createElement(CategoryIcon, { icon: category.icon, className: "size-6 rounded-lg" }),
      group: groups.find((group) => group.id === category.groupId)?.name,
    }));

  function changeType(nextType: TransactionType, { byUser = true } = {}) {
    form.setValue("type", nextType, { shouldDirty: byUser });
    form.setValue("categoryId", "");
  }

  // Spoken details fill only fields the user has not changed, so speaking again can
  // correct an earlier attempt without overwriting anything typed by hand.
  function applyVoiceEntry(text: string): QuickEntry {
    const entry = parseQuickEntry(text, today);
    const userEdited = (name: TransactionFormField) => Boolean(form.getFieldState(name).isDirty);
    const fill = (name: "amount" | "date" | "note", value: string | undefined) => {
      if (value && !userEdited(name)) form.setValue(name, value, { shouldValidate: name !== "note" });
    };
    const canChooseCategory = () => !userEdited("categoryId");
    const canChangeType = () => !userEdited("type") && canChooseCategory();

    if (entry.type && entry.type !== form.getValues("type") && canChangeType())
      changeType(entry.type, { byUser: false });
    fill("amount", entry.amount);
    fill("date", entry.date);
    fill("note", entry.note);

    const note = entry.note;
    if (note && canChooseCategory()) {
      const chooseCategory = (categoryId: string) => {
        const category = categories.find((option) => option.id === categoryId);
        if (!category || !canChooseCategory()) return;
        if (category.type !== form.getValues("type")) {
          if (!canChangeType() || entry.type) return;
          changeType(category.type, { byUser: false });
        }
        form.setValue("categoryId", category.id, { shouldValidate: true });
      };
      const named = categories.find(
        (category) =>
          category.name.toLowerCase() === note.toLowerCase() &&
          category.type === (entry.type ?? form.getValues("type")),
      );
      if (named) chooseCategory(named.id);
      else
        void suggestCategory(note).then((suggestion) => {
          if (suggestion) chooseCategory(suggestion.categoryId);
        });
    }
    return entry;
  }

  async function submitTransaction(values: CreateTransactionValues) {
    if (receiptUploading) return;
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
      form.reset({ ...values, amount: "", note: "", receiptId: undefined });
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
    changeType: (nextType: TransactionType) => changeType(nextType),
    receiptId,
    receiptUploading,
    setReceiptUploading,
    selectReceipt: (id: string | undefined) => form.setValue("receiptId", id, { shouldDirty: true }),
    applyReceiptDraft: (draft: ReceiptDraft) => {
      if (draft.total) form.setValue("amount", draft.total, { shouldDirty: true, shouldValidate: true });
      if (draft.date) form.setValue("date", draft.date, { shouldDirty: true, shouldValidate: true });
      if (draft.merchant) form.setValue("note", draft.merchant, { shouldDirty: true });
    },
    applyVoiceEntry,
    handleSubmit: form.handleSubmit(submitTransaction),
  };
}
