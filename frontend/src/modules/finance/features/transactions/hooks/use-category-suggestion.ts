import type { CategorySuggestion } from "@keepitbalance/shared/finance";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import { financeKeys } from "../../../shared/query-keys.ts";

export function useCategorySuggestion() {
  const queryClient = useQueryClient();
  return (note: string) =>
    queryClient
      .fetchQuery({
        queryKey: [...financeKeys.transactions(), "category-suggestion", note.toLowerCase()],
        queryFn: ({ signal }) =>
          api.get<{ data: CategorySuggestion | null }>("/transactions/category-suggestion", {
            query: { note },
            signal,
          }),
      })
      .then((response) => response.data)
      .catch(() => null);
}
