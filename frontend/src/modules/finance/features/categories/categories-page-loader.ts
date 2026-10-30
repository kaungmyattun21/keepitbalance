import { ensureQuery } from "@/shared/lib/query-client";
import { categoryGroupsQuery } from "../../shared/hooks/use-category-groups.ts";

export async function categoriesPageLoader() {
  await ensureQuery(categoryGroupsQuery);
  return null;
}
