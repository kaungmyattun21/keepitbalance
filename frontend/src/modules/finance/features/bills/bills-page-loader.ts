import { ensureQuery } from "@/shared/lib/query-client";
import { categoryGroupsQuery } from "../../shared/hooks/use-category-groups.ts";
import { billsQuery } from "./hooks/use-bills.ts";

export async function billsPageLoader() {
  await Promise.all([ensureQuery(billsQuery), ensureQuery(categoryGroupsQuery)]);
  return null;
}
