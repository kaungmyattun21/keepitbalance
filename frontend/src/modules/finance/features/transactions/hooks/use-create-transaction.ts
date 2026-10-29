import type { CreateTransactionValues, Transaction } from "@keepitbalance/shared/finance";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import { invalidateMoneyQueries } from "../../../shared/invalidate-money-queries.ts";

export function useCreateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: CreateTransactionValues) => api.post<Transaction>("/transactions", values),
    onSuccess: () => invalidateMoneyQueries(queryClient),
  });
}
