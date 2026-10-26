import type { Request, RequestHandler } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { unauthorized } from "../../../shared/errors.ts";
import { auth } from "./auth.ts";

export const requireAuth: RequestHandler = async (req, res, next) => {
  const { headers, response: session } = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
    returnHeaders: true,
  });

  if (!session) {
    return next(unauthorized("Not logged in or session expired"));
  }

  // Forward the renewed cookie when Better Auth extends the session.
  const setCookie = headers.getSetCookie();
  if (setCookie.length > 0) {
    res.append("Set-Cookie", setCookie);
  }

  req.userId = session.user.id;
  next();
};

export function getUserId(req: Request): string {
  if (!req.userId) throw unauthorized();
  return req.userId;
}
