import type { Request, Response } from "express";
import { getUserId } from "../require-auth.ts";
import * as service from "./service.ts";

export async function getMe(req: Request, res: Response) {
  const profile = await service.getProfile(getUserId(req));
  res.json(profile);
}
