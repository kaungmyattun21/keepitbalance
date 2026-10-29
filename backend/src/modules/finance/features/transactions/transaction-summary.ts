import type { CategoryTotal, TransactionSummary, TransactionType } from "@keepitbalance/shared/finance";
import { Prisma } from "../../../../generated/prisma/client.ts";
import { toApiType } from "../../shared/transaction-type.ts";
import type { CategorySumRow } from "./repository.ts";

type SummaryInput = {
  month: string;
  categorySums: CategorySumRow[];
  categoryNames: Map<string, string>;
  typeFilter?: TransactionType;
};

// Decimal arithmetic keeps money exact; floats would drift (0.1 + 0.2).
export function toTransactionSummary({
  month,
  categorySums,
  categoryNames,
  typeFilter,
}: SummaryInput): TransactionSummary {
  let totalIncome = new Prisma.Decimal(0);
  let totalExpense = new Prisma.Decimal(0);

  const categoryTotals = categorySums.map((row) => {
    const total = row._sum.amount ?? new Prisma.Decimal(0);
    if (row.type === "INCOME") totalIncome = totalIncome.plus(total);
    else totalExpense = totalExpense.plus(total);
    return { row, total };
  });

  const byCategory: CategoryTotal[] = categoryTotals
    .sort((left, right) => right.total.comparedTo(left.total))
    .map(({ row, total }) => ({
      categoryId: row.categoryId,
      name: categoryNames.get(row.categoryId) ?? "Unknown category",
      type: toApiType[row.type],
      total: total.toFixed(2),
    }))
    .filter((categoryTotal) => !typeFilter || categoryTotal.type === typeFilter);

  return {
    month,
    totalIncome: totalIncome.toFixed(2),
    totalExpense: totalExpense.toFixed(2),
    net: totalIncome.minus(totalExpense).toFixed(2),
    byCategory,
  };
}
