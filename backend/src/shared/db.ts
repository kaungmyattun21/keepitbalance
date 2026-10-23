// The single PrismaClient for the whole app. Only repositories should import this.
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.ts";
import { config } from "./config.ts";

const adapter = new PrismaPg({ connectionString: config.databaseUrl });

export const prisma = new PrismaClient({
  adapter,
  log: config.isProduction ? ["error"] : ["warn", "error"],
});
