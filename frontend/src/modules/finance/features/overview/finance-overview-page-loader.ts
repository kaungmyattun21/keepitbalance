import type { LoaderFunctionArgs } from "react-router";
import { cachedUserTimezone } from "@/modules/auth";
import { ensureQuery } from "@/shared/lib/query-client";
import { monthlyBudgetsQuery } from "../../shared/hooks/use-monthly-budgets.ts";
import { readMonthParam } from "../../shared/month-param.ts";
import { transactionSummaryQuery } from "./hooks/use-transaction-summary.ts";

// Args are optional so the sidebar can preload the page without a request.
export async function financeOverviewPageLoader(args?: LoaderFunctionArgs) {
  const searchParams = args ? new URL(args.request.url).searchParams : new URLSearchParams();
  const month = readMonthParam(searchParams, cachedUserTimezone());
  await Promise.all([ensureQuery(transactionSummaryQuery(month)), ensureQuery(monthlyBudgetsQuery(month))]);
  return null;
}
