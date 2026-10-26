import {
  QueryClient,
  type DefaultError,
  type QueryExecuteOptions,
  type QueryKey,
} from "@tanstack/react-query";
import { ApiError } from "./api.ts";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
        return failureCount < 2;
      },
    },
    mutations: {
      retry: false,
    },
  },
});

// Returns cached data even when stale (components refresh it in the background); fetches only on a miss.
export function ensureQuery<
  TQueryFnData,
  TError = DefaultError,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>(options: QueryExecuteOptions<TQueryFnData, TError, TData, TQueryFnData, TQueryKey>): Promise<TData> {
  return queryClient.query({ ...options, staleTime: "static" });
}
