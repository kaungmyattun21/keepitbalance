import type { Transaction, UpdateTransactionValues } from "@keepitbalance/shared/finance";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import { invalidateMoneyQueries } from "../../../shared/invalidate-money-queries.ts";

type UpdateTransactionRequest = { id: string; values: UpdateTransactionValues };

export function useUpdateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, values }: UpdateTransactionRequest) =>
      api.put<Transaction>(`/transactions/${id}`, values),
    onSuccess: () => invalidateMoneyQueries(queryClient),
  });
}
