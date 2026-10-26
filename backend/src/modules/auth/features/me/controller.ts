import type { Profile } from "@keepitbalance/shared/api";
import type { Request, Response } from "express";
import { getUserId } from "../../shared/require-auth.ts";
import * as service from "./service.ts";

export async function getMe(req: Request, res: Response) {
  const profile = await service.getProfile(getUserId(req));
  const body: Profile = { ...profile, createdAt: profile.createdAt.toISOString() };
  res.json(body);
}
