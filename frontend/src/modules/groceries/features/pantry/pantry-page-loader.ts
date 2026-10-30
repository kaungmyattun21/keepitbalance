import { ensureQuery } from "@/shared/lib/query-client";
import { ingredientsQuery, pantryQuery } from "../../shared/queries.ts";

export async function pantryPageLoader() {
  await Promise.all([ensureQuery(ingredientsQuery), ensureQuery(pantryQuery)]);
  return null;
}
