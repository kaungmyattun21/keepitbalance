import { Router } from "express";
import * as controller from "./controller.ts";

export const authConfigRoutes = Router();

authConfigRoutes.get("/", controller.getAuthConfig);
