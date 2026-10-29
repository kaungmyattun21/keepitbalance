export const financeKeys = {
  all: ["finance"] as const,
  categories: () => [...financeKeys.all, "categories"] as const,
  transactions: () => [...financeKeys.all, "transactions"] as const,
  transactionList: (params: { month: string; page: number }) =>
    [...financeKeys.transactions(), "list", params] as const,
  transactionSummary: (month: string) => [...financeKeys.transactions(), "summary", month] as const,
  budgets: () => [...financeKeys.all, "budgets"] as const,
  monthlyBudgets: (month: string) => [...financeKeys.budgets(), month] as const,
};
