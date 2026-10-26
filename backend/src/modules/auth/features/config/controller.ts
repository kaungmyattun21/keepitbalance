import type { AuthConfig } from "@keepitbalance/shared/api";
import type { Request, Response } from "express";
import { config } from "../../../../shared/config.ts";

export function getAuthConfig(_req: Request, res: Response) {
  const body: AuthConfig = { google: config.auth.google !== undefined };
  res.json(body);
}
