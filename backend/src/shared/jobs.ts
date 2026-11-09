import { PgBoss } from "pg-boss";
import { config } from "./config.ts";

// pg-boss manages its own schema. Prisma continues to own our application tables.
const boss = new PgBoss({ connectionString: config.databaseUrl, schema: "pgboss", max: 3 });
boss.on("error", () => console.error("Background queue error; check database connectivity."));
let starting: Promise<PgBoss> | undefined;

export function getJobs() {
  starting ??= boss.start().catch((error: unknown) => {
    starting = undefined;
    throw error;
  });
  return starting;
}

export async function stopJobs() {
  if (starting) {
    await starting;
    await boss.stop({ graceful: true, timeout: 150_000 });
    starting = undefined;
  }
}
