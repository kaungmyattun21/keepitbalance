import { ensureQuery } from "@/shared/lib/query-client";
import { recipesQuery } from "../../shared/planning-queries.ts";
import { ingredientsQuery } from "../../shared/queries.ts";
export async function recipesPageLoader() {
  await Promise.all([ensureQuery(recipesQuery), ensureQuery(ingredientsQuery)]);
  return null;
}
