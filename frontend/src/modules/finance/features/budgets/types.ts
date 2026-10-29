import type { Budget, Category } from "@keepitbalance/shared/finance";

export type BudgetsView = "default" | "editing" | "skipped";

export type BudgetFormRow = {
  categoryId: string;
  categoryName: string;
  selected: boolean;
  amount: string;
};

export type BudgetFormValues = { rows: BudgetFormRow[] };

export type BudgetFormOptions = {
  expenseCategories: Category[];
  budgets: Budget[];
  onSaved: () => void;
};
