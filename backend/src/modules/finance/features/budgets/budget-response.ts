import type { MonthlyBudgets } from "@keepitbalance/shared/finance";
import { Prisma } from "../../../../generated/prisma/client.ts";
import { toApiType } from "../../shared/transaction-type.ts";
import type { BudgetRow, CategorySpendingRow } from "./repository.ts";

type MonthlyBudgetsInput = {
  month: string;
  budgets: BudgetRow[];
  spending: CategorySpendingRow[];
};

export function toMonthlyBudgets({ month, budgets, spending }: MonthlyBudgetsInput): MonthlyBudgets {
  const spentByCategory = new Map(
    spending.map((row) => [row.categoryId, row._sum.amount ?? new Prisma.Decimal(0)]),
  );
  let totalBudget = new Prisma.Decimal(0);
  let totalSpent = new Prisma.Decimal(0);

  const data = budgets.map((budget) => {
    const spent = spentByCategory.get(budget.category.id) ?? new Prisma.Decimal(0);
    totalBudget = totalBudget.plus(budget.amount);
    totalSpent = totalSpent.plus(spent);
    return {
      id: budget.id,
      category: {
        id: budget.category.id,
        name: budget.category.name,
        type: toApiType[budget.category.type],
      },
      amount: budget.amount.toFixed(2),
      spent: spent.toFixed(2),
      remaining: budget.amount.minus(spent).toFixed(2),
    };
  });

  return { month, totalBudget: totalBudget.toFixed(2), totalSpent: totalSpent.toFixed(2), data };
}
