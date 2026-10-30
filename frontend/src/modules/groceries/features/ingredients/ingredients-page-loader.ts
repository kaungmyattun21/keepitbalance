import { ensureQuery } from "@/shared/lib/query-client";
import { ingredientsQuery } from "../../shared/queries.ts";

export async function ingredientsPageLoader() {
  await Promise.all([ensureQuery(ingredientsQuery)]);
  return null;
}
