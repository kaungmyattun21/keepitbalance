import type { LoaderFunctionArgs } from "react-router";
import { cachedUserTimezone } from "@/modules/auth";
import { ensureQuery } from "@/shared/lib/query-client";
import { categoriesQuery } from "../../shared/hooks/use-categories.ts";
import { transactionsQuery } from "./hooks/use-transactions.ts";
import { readTransactionListParams } from "./transaction-list-params.ts";

// Args are optional so the sidebar can preload the page without a request.
export async function financePageLoader(args?: LoaderFunctionArgs) {
  const searchParams = args ? new URL(args.request.url).searchParams : new URLSearchParams();
  const listParams = readTransactionListParams(searchParams, cachedUserTimezone());
  await Promise.all([ensureQuery(categoriesQuery), ensureQuery(transactionsQuery(listParams))]);
  return null;
}
