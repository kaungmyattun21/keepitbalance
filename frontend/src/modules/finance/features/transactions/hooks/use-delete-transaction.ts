import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import { invalidateMoneyQueries } from "../../../shared/invalidate-money-queries.ts";

export function useDeleteTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/transactions/${id}`),
    onSuccess: () => invalidateMoneyQueries(queryClient),
  });
}
