export const financeKeys = {
  all: ["finance"] as const,
  categories: () => [...financeKeys.all, "categories"] as const,
  transactions: () => [...financeKeys.all, "transactions"] as const,
  transactionList: (params: { month: string; page: number }) =>
    [...financeKeys.transactions(), params] as const,
};
