import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";

export const apiStatusQuery = queryOptions({
  queryKey: ["system", "health"],
  queryFn: ({ signal }) => api.get<{ status: string }>("/health", { signal }),
});

export function useApiStatus() {
  return useSuspenseQuery(apiStatusQuery).data;
}
