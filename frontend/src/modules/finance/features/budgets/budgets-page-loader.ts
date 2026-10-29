import type { LoaderFunctionArgs } from "react-router";
import { cachedUserTimezone } from "@/modules/auth";
import { ensureQuery } from "@/shared/lib/query-client";
import { categoriesQuery } from "../../shared/hooks/use-categories.ts";
import { monthlyBudgetsQuery } from "../../shared/hooks/use-monthly-budgets.ts";
import { readMonthParam } from "../../shared/month-param.ts";

export async function budgetsPageLoader({ request }: LoaderFunctionArgs) {
  const month = readMonthParam(new URL(request.url).searchParams, cachedUserTimezone());
  await Promise.all([ensureQuery(categoriesQuery), ensureQuery(monthlyBudgetsQuery(month))]);
  return null;
}
