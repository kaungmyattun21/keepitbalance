import { zodResolver } from "@hookform/resolvers/zod";
import { positiveMoneySchema, replaceBudgetsSchema } from "@keepitbalance/shared/finance";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { ApiError } from "@/shared/lib/api";
import { sumMoney } from "@/shared/lib/money";
import { financeKeys } from "../../../shared/query-keys.ts";
import type { BudgetFormOptions, BudgetFormRow, BudgetFormValues } from "../types.ts";
import { useReplaceBudgets } from "./use-replace-budgets.ts";

const budgetFormSchema = z
  .object({
    rows: z.array(
      z.object({
        categoryId: z.string(),
        categoryName: z.string(),
        selected: z.boolean(),
        amount: z.string(),
      }),
    ),
  })
  .superRefine((values, context) => {
    values.rows.forEach((row, index) => {
      if (!row.selected) return;
      const amount = positiveMoneySchema.safeParse(row.amount);
      if (!amount.success) {
        context.addIssue({
          code: "custom",
          path: ["rows", index, "amount"],
          message: amount.error.issues[0]?.message ?? "Enter an amount.",
        });
      }
    });
  });

const BUDGET_AMOUNT_PATH = /^budgets\.(\d+)\.amount$/;

export function useBudgetForm({ expenseCategories, budgets, onSaved }: BudgetFormOptions) {
  const queryClient = useQueryClient();
  const replaceBudgets = useReplaceBudgets();
  const [formError, setFormError] = useState<string | null>(null);
  const budgetAmounts = new Map(budgets.map((budget) => [budget.category.id, budget.amount]));

  const form = useForm<BudgetFormValues>({
    resolver: zodResolver(budgetFormSchema),
    defaultValues: {
      rows: expenseCategories.map((category) => ({
        categoryId: category.id,
        categoryName: category.name,
        selected: budgetAmounts.has(category.id),
        amount: budgetAmounts.get(category.id) ?? "",
      })),
    },
  });
  const { fields } = useFieldArray({ control: form.control, name: "rows" });
  const rows = useWatch({ control: form.control, name: "rows" });
  const selectedRows = rows.filter((row) => row.selected);
  const monthlyTotal = sumMoney(selectedRows.map((row) => row.amount));

  function selectRow(index: number, selected: boolean) {
    form.setValue(`rows.${index}.selected`, selected);
    if (!selected) form.clearErrors(`rows.${index}.amount`);
  }

  function changeAmount(index: number, amount: string) {
    form.setValue(`rows.${index}.amount`, amount, { shouldValidate: form.formState.isSubmitted });
    if (amount.trim() !== "") form.setValue(`rows.${index}.selected`, true);
  }

  async function saveBudgets(values: BudgetFormValues) {
    setFormError(null);
    const chosenRows = values.rows.filter((row) => row.selected);
    const request = replaceBudgetsSchema.parse({
      budgets: chosenRows.map((row) => ({ categoryId: row.categoryId, amount: row.amount })),
    });
    try {
      await replaceBudgets.mutateAsync(request);
      toast.success(chosenRows.length === 0 ? "Budgets removed." : "Budgets saved.");
      onSaved();
    } catch (error) {
      showServerError(error, values.rows, chosenRows);
    }
  }

  function showServerError(error: unknown, allRows: BudgetFormRow[], chosenRows: BudgetFormRow[]) {
    if (!(error instanceof ApiError)) {
      setFormError("Something went wrong. Please try again.");
      return;
    }
    if (error.code === "NOT_FOUND" || error.code === "CATEGORY_TYPE_MISMATCH") {
      void queryClient.invalidateQueries({ queryKey: financeKeys.categories() });
      setFormError("Your categories changed while you were editing. Refresh the page and try again.");
      return;
    }

    let mappedAnyIssue = false;
    for (const issue of error.validationIssues) {
      const match = BUDGET_AMOUNT_PATH.exec(issue.path);
      const chosenRow = match ? chosenRows[Number(match[1])] : undefined;
      const rowIndex = chosenRow ? allRows.indexOf(chosenRow) : -1;
      if (rowIndex === -1) continue;
      form.setError(`rows.${rowIndex}.amount`, { message: issue.message });
      mappedAnyIssue = true;
    }
    if (!mappedAnyIssue) setFormError(error.message);
  }

  return {
    form,
    fields,
    rows,
    formError,
    monthlyTotal,
    selectedCount: selectedRows.length,
    selectRow,
    changeAmount,
    handleSubmit: form.handleSubmit(saveBudgets),
  };
}
