import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  RecipeValues,
  Recipe,
  MealValues,
  MealPlanEntry,
  MealEatenValues,
  ApplyGenerationValues,
  GenerationResult,
} from "@keepitbalance/shared/meal-planning";
import { api } from "@/shared/lib/api";
import { groceryKeys } from "./query-keys.ts";
function useRefresh() {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: groceryKeys.all });
}
export function useRecipeMutation() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (
      input: { action: "save"; values: RecipeValues; recipe?: Recipe } | { action: "delete"; id: string },
    ): Promise<Recipe | void> => {
      if (input.action === "delete") return api.delete(`/recipes/${input.id}`);
      return input.recipe
        ? api.put<Recipe>(`/recipes/${input.recipe.id}`, {
            ...input.values,
            updatedAt: input.recipe.updatedAt,
          })
        : api.post<Recipe>("/recipes", input.values);
    },
    onSuccess: refresh,
    onError: refresh,
  });
}
export function useMealMutation() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (
      input:
        | { action: "save"; values: MealValues; meal?: MealPlanEntry }
        | { action: "delete"; id: string }
        | { action: "eaten"; id: string; values: MealEatenValues },
    ): Promise<MealPlanEntry | void> => {
      if (input.action === "delete") return api.delete(`/meal-plans/${input.id}`);
      if (input.action === "eaten") return api.patch<MealPlanEntry>(`/meal-plans/${input.id}`, input.values);
      return input.meal
        ? api.put<MealPlanEntry>(`/meal-plans/${input.meal.id}`, {
            ...input.values,
            updatedAt: input.meal.updatedAt,
          })
        : api.post<MealPlanEntry>("/meal-plans", input.values);
    },
    onSuccess: refresh,
    onError: refresh,
  });
}
export function useGenerationMutation() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (values: ApplyGenerationValues) => api.post<GenerationResult>("/shopping-generation", values),
    onSuccess: refresh,
  });
}
