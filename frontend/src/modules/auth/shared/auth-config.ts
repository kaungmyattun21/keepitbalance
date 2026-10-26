import type { AuthConfig } from "@keepitbalance/shared/api";
import { queryOptions } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";

export const authConfigQuery = queryOptions({
  queryKey: ["auth", "config"],
  queryFn: ({ signal }) => api.get<AuthConfig>("/auth-config", { signal }),
  staleTime: Infinity,
});
