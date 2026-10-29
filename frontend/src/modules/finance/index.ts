import type { RouteObject } from "react-router";
import { FinanceLayout } from "./shared/components/FinanceLayout.tsx";

export async function lazyFinanceOverviewPage() {
  const [{ FinanceOverviewPage }, { financeOverviewPageLoader }] = await Promise.all([
    import("./features/overview/FinanceOverviewPage.tsx"),
    import("./features/overview/finance-overview-page-loader.ts"),
  ]);
  return { Component: FinanceOverviewPage, loader: financeOverviewPageLoader };
}

export async function lazyTransactionsPage() {
  const [{ TransactionsPage }, { transactionsPageLoader }] = await Promise.all([
    import("./features/transactions/TransactionsPage.tsx"),
    import("./features/transactions/transactions-page-loader.ts"),
  ]);
  return { Component: TransactionsPage, loader: transactionsPageLoader };
}

export async function lazyBudgetsPage() {
  const [{ BudgetsPage }, { budgetsPageLoader }] = await Promise.all([
    import("./features/budgets/BudgetsPage.tsx"),
    import("./features/budgets/budgets-page-loader.ts"),
  ]);
  return { Component: BudgetsPage, loader: budgetsPageLoader };
}

export async function lazyBillsPage() {
  const { BillsPage } = await import("./features/bills/BillsPage.tsx");
  return { Component: BillsPage };
}

export const financeRoute: RouteObject = {
  path: "finance",
  Component: FinanceLayout,
  children: [
    { index: true, lazy: lazyFinanceOverviewPage },
    { path: "transactions", lazy: lazyTransactionsPage },
    { path: "budgets", lazy: lazyBudgetsPage },
    { path: "bills", lazy: lazyBillsPage },
  ],
};
