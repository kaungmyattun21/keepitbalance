import { toNodeHandler } from "better-auth/node";
import cors from "cors";
import express, { json, Router } from "express";
import helmet from "helmet";
import { auth, meRoutes, onUserCreated } from "./modules/auth/index.ts";
import { createDefaultCategories } from "./modules/finance/index.ts";
import { config } from "./shared/config.ts";
import { prisma } from "./shared/db.ts";
import { errorHandler, notFoundHandler } from "./shared/middleware/error-handler.ts";

onUserCreated(createDefaultCategories);

export const app = express();

app.disable("x-powered-by");
app.use(helmet());
app.use(cors({ origin: config.webUrl, credentials: true }));

// Better Auth reads the raw body itself, so it must be mounted before express.json().
app.all("/api/v1/auth/*splat", toNodeHandler(auth));

app.use(json({ limit: "100kb" }));

const api = Router();

api.get("/health", async (_req, res) => {
  await prisma.$queryRaw`SELECT 1`;
  res.json({ status: "ok" });
});

api.use("/me", meRoutes);

app.use("/api/v1", api);

app.use(notFoundHandler);
app.use(errorHandler);
