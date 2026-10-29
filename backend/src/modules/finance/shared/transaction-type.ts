import type { TransactionType } from "@keepitbalance/shared/finance";
import type { TransactionType as DbTransactionType } from "../../../generated/prisma/client.ts";

export const toDbType = { income: "INCOME", expense: "EXPENSE" } as const satisfies Record<
  TransactionType,
  DbTransactionType
>;

export const toApiType = { INCOME: "income", EXPENSE: "expense" } as const satisfies Record<
  DbTransactionType,
  TransactionType
>;
