import { Router } from "express";
import { weekQuerySchema, applyGenerationSchema } from "@keepitbalance/shared/meal-planning";
import { requireAuth } from "../../../auth/index.ts";
import { validate } from "../../../../shared/middleware/validate.ts";
import * as controller from "./controller.ts";
export const generationRoutes = Router();
generationRoutes.use(requireAuth);
generationRoutes.get("/", validate({ query: weekQuerySchema }), controller.preview);
generationRoutes.post("/", validate({ body: applyGenerationSchema }), controller.apply);
