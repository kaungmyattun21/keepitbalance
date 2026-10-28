import { toNodeHandler } from "better-auth/node";
import cors from "cors";
import express, { json, Router, text } from "express";
import helmet from "helmet";
import { auth, authConfigRoutes, meRoutes, onUserCreated } from "./modules/auth/index.ts";
import { createDefaultCategories } from "./modules/finance/index.ts";
import { config } from "./shared/config.ts";
import { prisma } from "./shared/db.ts";
import { errorHandler, notFoundHandler } from "./shared/middleware/error-handler.ts";
import { resolveClientAddress } from "./shared/middleware/trusted-proxy.ts";

onUserCreated(createDefaultCategories);

export const app = express();

app.disable("x-powered-by");
app.set("trust proxy", config.trustedProxies);
app.use(helmet());
app.use(cors({ origin: config.webUrl, credentials: true }));
app.use(resolveClientAddress);

const bodyOptions = { limit: "100kb", inflate: false } as const;
const handleAuth = toNodeHandler(auth);

// Bound the stream before auth parses JSON or form data. The Node adapter accepts
// an already-read string body, preserving the original JSON/form representation.
app.all("/api/v1/auth/*splat", text({ ...bodyOptions, type: () => true }), async (req, res) => {
  // Preserve bodyless requests, such as sign-out, after the text parser reads zero bytes.
  if (req.body === "") req.body = undefined;
  await handleAuth(req, res);
});

app.use(json(bodyOptions));

const api = Router();

api.get("/health", async (_req, res) => {
  await prisma.$queryRaw`SELECT 1`;
  res.json({ status: "ok" });
});

api.use("/auth-config", authConfigRoutes);
api.use("/me", meRoutes);

app.use("/api/v1", api);

app.use(notFoundHandler);
app.use(errorHandler);
