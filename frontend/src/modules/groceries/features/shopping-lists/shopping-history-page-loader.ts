import { ensureQuery } from "@/shared/lib/query-client";
import { shoppingHistoryQuery } from "../../shared/queries.ts";

export async function shoppingHistoryPageLoader() {
  await Promise.all([ensureQuery(shoppingHistoryQuery)]);
  return null;
}
