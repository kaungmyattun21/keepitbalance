import type { QueryClient } from "@tanstack/react-query";
import { financeKeys } from "./query-keys.ts";

// A transaction change moves list, summary and budget numbers, so all of them refresh.
export function invalidateMoneyQueries(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: financeKeys.transactions() }),
    queryClient.invalidateQueries({ queryKey: financeKeys.budgets() }),
  ]);
}
