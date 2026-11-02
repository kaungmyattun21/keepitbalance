import type { Prisma } from "../../../generated/prisma/client.ts";
import { prisma } from "../../../shared/db.ts";

// A user's grocery writes share one lock, including inserts. Generation can then
// compare its preview and apply changes against one consistent snapshot.
export function withGroceryWrite<T>(userId: string, action: (tx: Prisma.TransactionClient) => Promise<T>) {
  return prisma.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId}::uuid FOR UPDATE`;
      return action(tx);
    },
    { timeout: 10000 },
  );
}
