import type { Page } from "@keepitbalance/shared/api";
import type { Transaction } from "@keepitbalance/shared/finance";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import { financeKeys } from "../../../shared/query-keys.ts";
import { TRANSACTIONS_PAGE_SIZE } from "../transaction-list-params.ts";
import type { TransactionListParams } from "../types.ts";

export function transactionsQuery({ month, page }: TransactionListParams) {
  return queryOptions({
    queryKey: financeKeys.transactionList({ month, page }),
    queryFn: ({ signal }) =>
      api.get<Page<Transaction>>("/transactions", {
        query: { month, page, pageSize: TRANSACTIONS_PAGE_SIZE },
        signal,
      }),
  });
}

export function useTransactions(params: TransactionListParams): Page<Transaction> {
  return useSuspenseQuery(transactionsQuery(params)).data;
}
