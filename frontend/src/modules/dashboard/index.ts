export async function lazyDashboardPage() {
  const [{ DashboardPage }, { dashboardPageLoader }] = await Promise.all([
    import("./features/overview/DashboardPage.tsx"),
    import("./features/overview/dashboard-page-loader.ts"),
  ]);
  return { Component: DashboardPage, loader: dashboardPageLoader };
}
