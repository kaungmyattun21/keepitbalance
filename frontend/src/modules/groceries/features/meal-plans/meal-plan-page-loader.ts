import type { LoaderFunctionArgs } from "react-router";
import { cachedUserTimezone } from "@/modules/auth";
import { ensureQuery } from "@/shared/lib/query-client";
import { recipesQuery, mealPlanQuery, mealPlanPreferencesQuery } from "../../shared/planning-queries.ts";
import { planningPeriod } from "./planning-week.ts";
export async function mealPlanPageLoader({ request }: LoaderFunctionArgs) {
  const [, saved] = await Promise.all([ensureQuery(recipesQuery), ensureQuery(mealPlanPreferencesQuery)]);
  const period = planningPeriod(new URL(request.url).searchParams, cachedUserTimezone(), saved);
  await ensureQuery(mealPlanQuery(period));
  return null;
}
