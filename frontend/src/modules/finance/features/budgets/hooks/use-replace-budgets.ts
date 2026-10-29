import type { MonthlyBudgets, ReplaceBudgetsValues } from "@keepitbalance/shared/finance";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import { financeKeys } from "../../../shared/query-keys.ts";

export function useReplaceBudgets() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: ReplaceBudgetsValues) => api.put<MonthlyBudgets>("/budgets", values),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: financeKeys.budgets() }),
  });
}
