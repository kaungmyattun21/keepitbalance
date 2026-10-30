import { categoryGroupsQuery } from "../../shared/hooks/use-category-groups.ts";
import type { LoaderFunctionArgs } from "react-router";
import { cachedUserTimezone } from "@/modules/auth";
import { ensureQuery } from "@/shared/lib/query-client";
import { categoriesQuery } from "../../shared/hooks/use-categories.ts";
import { transactionsQuery } from "./hooks/use-transactions.ts";
import { readTransactionListParams } from "./transaction-list-params.ts";

export async function transactionsPageLoader({ request }: LoaderFunctionArgs) {
  const listParams = readTransactionListParams(new URL(request.url).searchParams, cachedUserTimezone());
  await Promise.all([
    ensureQuery(categoriesQuery),
    ensureQuery(categoryGroupsQuery),
    ensureQuery(transactionsQuery(listParams)),
  ]);
  return null;
}
