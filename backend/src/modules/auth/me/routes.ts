import { Router } from "express";
import { requireAuth } from "../require-auth.ts";
import * as controller from "./controller.ts";

export const meRoutes = Router();

meRoutes.get("/", requireAuth, controller.getMe);
