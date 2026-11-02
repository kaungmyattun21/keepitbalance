import type { LoaderFunctionArgs } from "react-router";
import { cachedUserTimezone } from "@/modules/auth";
import { ensureQuery } from "@/shared/lib/query-client";
import { recipesQuery, mealPlanQuery } from "../../shared/planning-queries.ts";
import { planningWeek } from "./planning-week.ts";
export async function mealPlanPageLoader({ request }: LoaderFunctionArgs) {
  const week = planningWeek(new URL(request.url).searchParams, cachedUserTimezone());
  await Promise.all([ensureQuery(recipesQuery), ensureQuery(mealPlanQuery(week))]);
  return null;
}
