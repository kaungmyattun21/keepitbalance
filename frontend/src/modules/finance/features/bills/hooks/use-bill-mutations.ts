import type {
  Bill,
  BillPaymentResult,
  CreateBillValues,
  UpdateBillValues,
  PayBillValues,
} from "@keepitbalance/shared/finance";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import { financeKeys } from "../../../shared/query-keys.ts";
import { invalidateMoneyQueries } from "../../../shared/invalidate-money-queries.ts";

export function useSaveBill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (
      input: { id: string; values: UpdateBillValues } | { id?: undefined; values: CreateBillValues },
    ) =>
      input.id ? api.put<Bill>(`/bills/${input.id}`, input.values) : api.post<Bill>("/bills", input.values),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: financeKeys.bills() }),
  });
}

export function usePayBill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, values }: { id: string; values: PayBillValues }) =>
      api.post<BillPaymentResult>(`/bills/${id}/payments`, values),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: financeKeys.bills() }),
        invalidateMoneyQueries(queryClient),
      ]),
  });
}

export function useDeleteBill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/bills/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: financeKeys.bills() }),
  });
}
