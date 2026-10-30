import { ensureQuery } from "@/shared/lib/query-client";
import { ingredientsQuery, currentListQuery } from "../../shared/queries.ts";
import { categoryGroupsQuery } from "@/modules/finance";

export async function shoppingListPageLoader() {
  await Promise.all([
    ensureQuery(ingredientsQuery),
    ensureQuery(currentListQuery),
    ensureQuery(categoryGroupsQuery),
  ]);
  return null;
}
