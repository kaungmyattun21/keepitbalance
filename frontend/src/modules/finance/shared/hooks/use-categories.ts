import type { Category } from "@keepitbalance/shared/finance";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import { financeKeys } from "../query-keys.ts";

export const categoriesQuery = queryOptions({
  queryKey: financeKeys.categories(),
  queryFn: async ({ signal }) => (await api.get<{ data: Category[] }>("/categories", { signal })).data,
});

export function useCategories(): Category[] {
  return useSuspenseQuery(categoriesQuery).data;
}
