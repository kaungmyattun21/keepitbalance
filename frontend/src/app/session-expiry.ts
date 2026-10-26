import type { DataRouter } from "react-router";
import { PUBLIC_PATHS } from "@/modules/auth";
import { setUnauthorizedHandler } from "@/shared/lib/api";
import { queryClient } from "@/shared/lib/query-client";

export function redirectToLoginOnSessionExpiry(router: DataRouter): void {
  setUnauthorizedHandler(() => {
    queryClient.clear();

    const { pathname, search } = router.state.location;
    if (PUBLIC_PATHS.has(pathname)) return;

    const redirectTo = encodeURIComponent(pathname + search);
    void router.navigate(`/login?redirectTo=${redirectTo}`, { replace: true });
  });
}
