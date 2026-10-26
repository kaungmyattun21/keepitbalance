import type { TransactionType } from "../../../../generated/prisma/client.ts";
import { prisma } from "../../../../shared/db.ts";

export function createMany(userId: string, categories: { type: TransactionType; name: string }[]) {
  return prisma.category.createMany({
    data: categories.map((category) => ({ ...category, userId })),
    skipDuplicates: true,
  });
}
