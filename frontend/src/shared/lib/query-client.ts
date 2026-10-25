// The app's single TanStack Query client (D-004). Shared because route loaders (D-021) and components
// both use it: loaders call queryClient.ensureQueryData(...), components call useQuery(...).
//
// Query key convention: each module exports its keys from its index.ts, starting with the module name,
// e.g. financeKeys = { all: ["finance"], transactions: (month) => ["finance", "transactions", month] }.
// Other modules invalidate through them (financeKeys.all), never by typing the array themselves.
import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "./api.ts";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000, // data is "fresh" for 30 s: revisiting a page within that time makes no request
      refetchOnWindowFocus: false, // a single user rarely changes data elsewhere; avoids refetch storms
      retry: (failureCount, error) => {
        // 4xx won't fix itself on retry (not logged in, not found, invalid); network/5xx might.
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
        return failureCount < 2;
      },
    },
    mutations: {
      retry: false, // never repeat a write automatically
    },
  },
});
