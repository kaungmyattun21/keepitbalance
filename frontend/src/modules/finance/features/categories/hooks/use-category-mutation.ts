import type {
  CreateCategoryValues,
  UpdateCategoryValues,
  CreateCategoryGroupValues,
  UpdateCategoryGroupValues,
} from "@keepitbalance/shared/finance";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import { financeKeys } from "../../../shared/query-keys.ts";

type CategoryMutation =
  | { resource: "categories"; id?: string; values?: CreateCategoryValues | UpdateCategoryValues }
  | {
      resource: "category-groups";
      id?: string;
      values?: CreateCategoryGroupValues | UpdateCategoryGroupValues;
    };
export function useCategoryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ resource, id, values }: CategoryMutation) => {
      const path = `/${resource}${id ? `/${id}` : ""}`;
      if (values === undefined) return api.delete(path);
      return id ? api.patch(path, values) : api.post(path, values);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: financeKeys.all }),
  });
}
