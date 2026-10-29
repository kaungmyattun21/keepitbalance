import type { MonthlyBudgets } from "@keepitbalance/shared/finance";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import { financeKeys } from "../query-keys.ts";

export function monthlyBudgetsQuery(month: string) {
  return queryOptions({
    queryKey: financeKeys.monthlyBudgets(month),
    queryFn: ({ signal }) => api.get<MonthlyBudgets>("/budgets", { query: { month }, signal }),
  });
}

export function useMonthlyBudgets(month: string): MonthlyBudgets {
  return useSuspenseQuery(monthlyBudgetsQuery(month)).data;
}
