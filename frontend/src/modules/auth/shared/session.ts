import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { queryClient } from "@/shared/lib/query-client";
import { authClient } from "./auth-client.ts";

export const sessionKeys = {
  all: ["auth", "session"] as const,
};

export const sessionQuery = queryOptions({
  queryKey: sessionKeys.all,
  queryFn: async () => {
    const { data, error } = await authClient.getSession();
    if (error) throw new Error(error.message ?? "Couldn't check your session");
    return data;
  },
  // Changes only on sign-in/out (refetched explicitly); an ended session surfaces as a 401 from the API.
  staleTime: Infinity,
});

export function refetchSession() {
  return queryClient.query({ ...sessionQuery, staleTime: 0 });
}

// For loaders, which can't use hooks; requireSession has already loaded the session.
export function cachedUserTimezone(): string {
  return queryClient.getQueryData(sessionQuery.queryKey)?.user.timezone ?? "UTC";
}

export function useSession() {
  return useSuspenseQuery(sessionQuery).data;
}

export function useCurrentUser() {
  const session = useSession();
  if (!session) throw new Error("useCurrentUser must be used inside a route guarded by requireSession");
  return session.user;
}
