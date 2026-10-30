import type { CategoryGroup } from "@keepitbalance/shared/finance";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import { financeKeys } from "../query-keys.ts";

export const categoryGroupsQuery = queryOptions({
  queryKey: financeKeys.categoryGroups(),
  queryFn: async ({ signal }) =>
    (await api.get<{ data: CategoryGroup[] }>("/category-groups", { signal })).data,
});
export function useCategoryGroups() {
  return useSuspenseQuery(categoryGroupsQuery).data;
}
