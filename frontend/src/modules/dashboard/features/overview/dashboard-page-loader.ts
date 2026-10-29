import { ensureQuery } from "@/shared/lib/query-client";
import { apiStatusQuery } from "./hooks/use-api-status.ts";

export async function dashboardPageLoader() {
  await ensureQuery(apiStatusQuery);
  return null;
}
