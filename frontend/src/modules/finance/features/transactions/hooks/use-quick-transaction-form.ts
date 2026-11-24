import type { FormEvent, KeyboardEvent } from "react";
import { useWatch } from "react-hook-form";
import type { TransactionFormOptions } from "../types.ts";
import { amountAfterKey } from "../amount-keypad.ts";
import { useTransactionForm } from "./use-transaction-form.ts";

export function useQuickTransactionForm(options: TransactionFormOptions) {
  const transaction = useTransactionForm(options);
  const { form } = transaction;
  const amount = useWatch({ control: form.control, name: "amount" });
  const pending = form.formState.isSubmitting || transaction.receiptUploading;
  function pressKey(key: string) {
    if (pending) return;
    form.setValue("amount", amountAfterKey(form.getValues("amount"), key), {
      shouldDirty: true,
      shouldValidate: Boolean(form.formState.errors.amount),
    });
  }
  function handleAmountKey(event: KeyboardEvent<HTMLInputElement>) {
    if (/^[0-9.]$/.test(event.key) || event.key === "Backspace" || event.key === "Delete") {
      event.preventDefault();
      pressKey(event.key);
    }
  }
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (pending) {
      event.preventDefault();
      return;
    }
    const value = form.getValues("amount");
    if (value.endsWith(".")) form.setValue("amount", value.slice(0, -1));
    return transaction.handleSubmit(event);
  }
  return { ...transaction, amount, pending, pressKey, handleAmountKey, handleSubmit };
}
