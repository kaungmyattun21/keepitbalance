// Express setup: global middleware, module routes, error handling. No listen() here, so tests can import the app.
import { toNodeHandler } from "better-auth/node";
import cors from "cors";
import express, { Router } from "express";
import helmet from "helmet";
import { auth, meRoutes, onUserCreated } from "./modules/auth/index.ts";
import { createDefaultCategories } from "./modules/finance/index.ts";
import { config } from "./shared/config.ts";
import { prisma } from "./shared/db.ts";
import { errorHandler, notFoundHandler } from "./shared/middleware/error-handler.ts";

// Cross-module wiring lives here, so Auth never imports Finance (D-014).
onUserCreated(createDefaultCategories);

export const app = express();

app.disable("x-powered-by");
app.use(helmet());
// credentials: true lets the browser send the session cookie from the frontend origin.
app.use(cors({ origin: config.webUrl, credentials: true }));

// Better Auth reads the raw request body itself, so it must come before express.json() (D-018).
app.all("/api/v1/auth/*splat", toNodeHandler(auth));

app.use(express.json({ limit: "100kb" }));

const api = Router();

api.get("/health", async (_req, res) => {
  await prisma.$queryRaw`SELECT 1`;
  res.json({ status: "ok" });
});

api.use("/me", meRoutes);
// api.use("/transactions", transactionRoutes);

app.use("/api/v1", api);

app.use(notFoundHandler);
app.use(errorHandler);
