// Entry point: starts the HTTP server and shuts it down cleanly.
import { app } from "./app.ts";
import { config } from "./shared/config.ts";
import { prisma } from "./shared/db.ts";

const server = app.listen(config.port, () => {
  console.log(`API listening on http://localhost:${config.port}/api/v1 (${config.env})`);
});

async function shutdown(signal: string) {
  console.log(`${signal} received, shutting down`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
