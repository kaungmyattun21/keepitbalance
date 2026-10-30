import type { Budget, CategoryGroup } from "@keepitbalance/shared/finance";

export type BudgetFormRow = {
  categoryId: string;
  categoryName: string;
  selected: boolean;
  amount: string;
};

export type BudgetFormValues = { rows: BudgetFormRow[] };

export type BudgetFormOptions = {
  expenseGroups: CategoryGroup[];
  budgets: Budget[];
  onSaved: () => void;
};
