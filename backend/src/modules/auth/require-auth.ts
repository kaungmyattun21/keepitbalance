import type { Request, RequestHandler } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { unauthorized } from "../../shared/errors.ts";
import { auth } from "./auth.ts";

// Looks up the session from the cookie (one indexed query, D-018) and sets req.userId.
export const requireAuth: RequestHandler = async (req, res, next) => {
  const { headers, response: session } = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
    returnHeaders: true,
  });

  if (!session) {
    return next(unauthorized("Not logged in or session expired"));
  }

  // When Better Auth extends the session (once a day, see auth.ts) it also renews the cookie.
  const setCookie = headers.getSetCookie();
  if (setCookie.length > 0) {
    res.append("Set-Cookie", setCookie);
  }

  req.userId = session.user.id;
  next();
};

// For controllers behind requireAuth: returns the logged-in user's id.
export function getUserId(req: Request): string {
  if (!req.userId) throw unauthorized();
  return req.userId;
}
