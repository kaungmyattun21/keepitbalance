import { ensureQuery } from "@/shared/lib/query-client";
import { authConfigQuery } from "../../shared/auth-config.ts";

export async function loginPageLoader() {
  await ensureQuery(authConfigQuery);
  return null;
}
