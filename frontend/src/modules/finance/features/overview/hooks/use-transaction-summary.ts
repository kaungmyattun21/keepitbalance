import type { TransactionSummary } from "@keepitbalance/shared/finance";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import { financeKeys } from "../../../shared/query-keys.ts";

export function transactionSummaryQuery(month: string) {
  return queryOptions({
    queryKey: financeKeys.transactionSummary(month),
    queryFn: ({ signal }) =>
      api.get<TransactionSummary>("/transactions/summary", { query: { month }, signal }),
  });
}

export function useTransactionSummary(month: string): TransactionSummary {
  return useSuspenseQuery(transactionSummaryQuery(month)).data;
}
