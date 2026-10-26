import { app } from "./app.ts";
import { config } from "./shared/config.ts";
import { prisma } from "./shared/db.ts";

const server = app.listen(config.port, () => {
  console.log(`API listening on http://localhost:${config.port}/api/v1 (${config.env})`);
});

function shutdown(signal: string) {
  console.log(`${signal} received, shutting down`);
  server.close(() => {
    prisma.$disconnect().then(
      () => process.exit(0),
      (err: unknown) => {
        console.error("Failed to disconnect from the database:", err);
        process.exit(1);
      },
    );
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
