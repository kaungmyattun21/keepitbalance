export const financeKeys = {
  all: ["finance"] as const,
  categoryGroups: () => [...financeKeys.all, "category-groups"] as const,
  categories: () => [...financeKeys.all, "categories"] as const,
  transactions: () => [...financeKeys.all, "transactions"] as const,
  transactionList: (params: { month: string; page: number }) =>
    [...financeKeys.transactions(), "list", params] as const,
  transactionSummary: (month: string) => [...financeKeys.transactions(), "summary", month] as const,
  bills: () => [...financeKeys.all, "bills"] as const,
  budgets: () => [...financeKeys.all, "budgets"] as const,
  monthlyBudgets: (month: string) => [...financeKeys.budgets(), month] as const,
};
