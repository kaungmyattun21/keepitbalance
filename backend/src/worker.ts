import { startReceiptWorker } from "./modules/finance/index.ts";
import { prisma } from "./shared/db.ts";
import { stopJobs } from "./shared/jobs.ts";

let stopping = false;
async function shutdown() {
  if (stopping) return;
  stopping = true;
  console.info("Stopping receipt worker; waiting for active extraction.");
  await stopJobs();
  await prisma.$disconnect();
}

process.on("SIGINT", () => {
  void shutdown().catch(() => {
    process.exitCode = 1;
  });
});
process.on("SIGTERM", () => {
  void shutdown().catch(() => {
    process.exitCode = 1;
  });
});

try {
  await startReceiptWorker();
  console.info("Receipt worker ready");
} catch {
  console.error("Receipt worker could not start; check database connectivity and migrations.");
  await shutdown();
  process.exitCode = 1;
}
