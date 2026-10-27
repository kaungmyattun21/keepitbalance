import { afterAll, beforeEach, vi } from "vitest";
import { prisma } from "../shared/db.ts";
import { outbox } from "./outbox.ts";

vi.mock("../shared/mailer.ts", async () => {
  const { outbox } = await import("./outbox.ts");
  return {
    sendEmail: vi.fn(async (email: (typeof outbox)[number]) => void outbox.push(email)),
    sendEmailInBackground: vi.fn((email: (typeof outbox)[number]) => void outbox.push(email)),
  };
});

beforeEach(async () => {
  outbox.length = 0;
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  const list = tables.map(({ tablename }) => `"${tablename}"`).join(", ");
  if (list) await prisma.$executeRawUnsafe(`TRUNCATE ${list} RESTART IDENTITY CASCADE`);
});

afterAll(async () => {
  await prisma.$disconnect();
});
