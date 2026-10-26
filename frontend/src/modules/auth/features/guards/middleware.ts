import { redirect, type MiddlewareFunction } from "react-router";
import { ensureQuery } from "@/shared/lib/query-client";
import { loginPathFor, safeRedirectPath } from "../../shared/redirect.ts";
import { refetchSession, sessionQuery } from "../../shared/session.ts";

export const requireSession: MiddlewareFunction = async ({ request }) => {
  const session = await ensureQuery(sessionQuery);
  if (!session) throw redirect(loginPathFor(new URL(request.url)));
};

// Always checks with the server: the cache may still hold a session that was just signed out.
export const guestOnly: MiddlewareFunction = async ({ request }) => {
  const session = await refetchSession();
  if (session) throw redirect(safeRedirectPath(new URL(request.url).searchParams.get("redirectTo")));
};
