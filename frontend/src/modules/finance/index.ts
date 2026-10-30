export { categoryGroupsQuery, useCategoryGroups } from "./shared/hooks/use-category-groups.ts";
export { invalidateMoneyQueries } from "./shared/invalidate-money-queries.ts";
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

export async function lazyCategoriesPage() {
  const [{ CategoriesPage }, { categoriesPageLoader }] = await Promise.all([
    import("./features/categories/CategoriesPage.tsx"),
    import("./features/categories/categories-page-loader.ts"),
  ]);
  return { Component: CategoriesPage, loader: categoriesPageLoader };
}

export async function lazyBillsPage() {
  const [{ BillsPage }, { billsPageLoader }] = await Promise.all([
    import("./features/bills/BillsPage.tsx"),
    import("./features/bills/bills-page-loader.ts"),
  ]);
  return { Component: BillsPage, loader: billsPageLoader };
}

export const financeRoute: RouteObject = {
  path: "finance",
  Component: FinanceLayout,
  children: [
    { index: true, lazy: lazyFinanceOverviewPage },
    { path: "transactions", lazy: lazyTransactionsPage },
    { path: "categories", lazy: lazyCategoriesPage },
    { path: "budgets", lazy: lazyBudgetsPage },
    { path: "bills", lazy: lazyBillsPage },
  ],
};
