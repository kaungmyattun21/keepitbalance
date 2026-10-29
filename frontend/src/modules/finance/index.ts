export async function lazyFinancePage() {
  const [{ FinancePage }, { financePageLoader }] = await Promise.all([
    import("./features/transactions/FinancePage.tsx"),
    import("./features/transactions/finance-page-loader.ts"),
  ]);
  return { Component: FinancePage, loader: financePageLoader };
}
