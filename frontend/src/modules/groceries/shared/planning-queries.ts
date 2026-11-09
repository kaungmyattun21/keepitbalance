import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import {
  resolvePlanningPeriod,
  type PlanningPeriod,
  type PlanningDateRange,
  type Recipe,
  type MealPlanEntry,
  type GenerationPreview,
} from "@keepitbalance/shared/meal-planning";
import { api } from "@/shared/lib/api";
import { groceryKeys } from "./query-keys.ts";
export const recipesQuery = queryOptions({
  queryKey: groceryKeys.recipes,
  queryFn: async ({ signal }) => (await api.get<{ data: Recipe[] }>("/recipes", { signal })).data,
});
export const mealPlanPreferencesQuery = queryOptions({
  queryKey: groceryKeys.mealPlanPreferences,
  queryFn: async ({ signal }) =>
    (await api.get<{ data: PlanningDateRange | null }>("/meal-plans/preferences", { signal })).data,
});
export const useMealPlanPreferences = () => useSuspenseQuery(mealPlanPreferencesQuery).data;
export const mealPlanQuery = (input: string | PlanningPeriod) => {
  const period = typeof input === "string" ? { weekStart: input } : input;
  const { startDate, endDate } = resolvePlanningPeriod(period);
  return queryOptions({
    queryKey: groceryKeys.mealPlan(startDate, endDate),
    queryFn: async ({ signal }) =>
      (await api.get<{ data: MealPlanEntry[] }>("/meal-plans", { signal, query: period })).data,
  });
};
export const generationQuery = (input: string | PlanningPeriod) => {
  const period = typeof input === "string" ? { weekStart: input } : input;
  const { startDate, endDate } = resolvePlanningPeriod(period);
  return queryOptions({
    queryKey: groceryKeys.generation(startDate, endDate),
    queryFn: ({ signal }) => api.get<GenerationPreview>("/shopping-generation", { signal, query: period }),
    staleTime: 0,
  });
};
export const useRecipes = () => useSuspenseQuery(recipesQuery).data;
export const useMealPlan = (period: string | PlanningPeriod) => useSuspenseQuery(mealPlanQuery(period)).data;
