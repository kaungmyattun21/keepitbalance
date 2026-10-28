import { isIP } from "node:net";
import type { RequestHandler } from "express";
import { badRequest } from "../errors.ts";

// Better Auth must use only this server-written header for IP-based security.
export const CLIENT_IP_HEADER = "x-keepitbalance-client-ip";

export const resolveClientAddress: RequestHandler = (req, _res, next) => {
  // Express walks the chain from the socket through explicitly trusted proxies.
  const clientIp = req.ip;
  if (!clientIp || !isIP(clientIp)) {
    return next(badRequest("VALIDATION_ERROR", "Invalid client IP address"));
  }

  const protocol = req.protocol;
  req.headers[CLIENT_IP_HEADER] = clientIp;
  // The Node auth adapter reads these headers directly, bypassing Express trust settings.
  req.headers["x-forwarded-proto"] = protocol === "https" ? "https" : "http";
  delete req.headers["x-forwarded-host"];
  next();
};
