import { currentMonthIn } from "@keepitbalance/shared/dates";
import type { BudgetsQuery, MonthlyBudgets, ReplaceBudgetsValues } from "@keepitbalance/shared/finance";
import { badRequest, notFound } from "../../../../shared/errors.ts";
import { monthDateRange } from "../../shared/calendar-date.ts";
import { toMonthlyBudgets } from "./budget-response.ts";
import * as repository from "./repository.ts";

export async function getMonthlyBudgets(
  userId: string,
  timezone: string,
  query: BudgetsQuery,
): Promise<MonthlyBudgets> {
  const month = query.month ?? currentMonthIn(timezone);
  const { from, before } = monthDateRange(month);

  const budgets = await repository.findBudgets(userId);
  const spending =
    budgets.length === 0
      ? []
      : await repository.sumExpensesByCategory(
          userId,
          budgets.map((budget) => budget.category.id),
          from,
          before,
        );

  return toMonthlyBudgets({ month, budgets, spending });
}

export async function replaceBudgets(
  userId: string,
  timezone: string,
  input: ReplaceBudgetsValues,
): Promise<MonthlyBudgets> {
  const categoryIds = input.budgets.map((entry) => entry.categoryId);
  const categories = await repository.findCategories(userId, categoryIds);
  const categoryTypes = new Map(categories.map((category) => [category.id, category.type]));

  for (const categoryId of categoryIds) {
    const type = categoryTypes.get(categoryId);
    if (!type) throw notFound("Category not found");
    if (type !== "EXPENSE") {
      throw badRequest("CATEGORY_TYPE_MISMATCH", "Budgets can only be set for expense categories");
    }
  }

  await repository.replaceBudgets(userId, input.budgets);
  return getMonthlyBudgets(userId, timezone, {});
}
