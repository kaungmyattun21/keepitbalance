import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import type { Recipe, MealPlanEntry, GenerationPreview } from "@keepitbalance/shared/meal-planning";
import { api } from "@/shared/lib/api";
import { groceryKeys } from "./query-keys.ts";
export const recipesQuery = queryOptions({
  queryKey: groceryKeys.recipes,
  queryFn: async ({ signal }) => (await api.get<{ data: Recipe[] }>("/recipes", { signal })).data,
});
export const mealPlanQuery = (weekStart: string) =>
  queryOptions({
    queryKey: groceryKeys.mealPlan(weekStart),
    queryFn: async ({ signal }) =>
      (await api.get<{ data: MealPlanEntry[] }>("/meal-plans", { signal, query: { weekStart } })).data,
  });
export const generationQuery = (weekStart: string) =>
  queryOptions({
    queryKey: groceryKeys.generation(weekStart),
    queryFn: ({ signal }) =>
      api.get<GenerationPreview>("/shopping-generation", { signal, query: { weekStart } }),
    staleTime: 0,
  });
export const useRecipes = () => useSuspenseQuery(recipesQuery).data;
export const useMealPlan = (week: string) => useSuspenseQuery(mealPlanQuery(week)).data;
