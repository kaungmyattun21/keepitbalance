import type { Bill } from "@keepitbalance/shared/finance";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import { financeKeys } from "../../../shared/query-keys.ts";

export const billsQuery = queryOptions({
  queryKey: financeKeys.bills(),
  queryFn: async ({ signal }) => (await api.get<{ data: Bill[] }>("/bills", { signal })).data,
});

export function useBills() {
  return useSuspenseQuery(billsQuery).data;
}
