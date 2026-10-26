import type { RouteObject } from "react-router";
import { loadDashboardPage } from "@/modules/dashboard";
import { NotFoundPage, PageLoader, RouteErrorBoundary } from "@/modules/shell";
import { AppShell } from "./AppShell.tsx";

export const routes: RouteObject[] = [
  {
    path: "/",
    Component: AppShell,
    ErrorBoundary: RouteErrorBoundary,
    HydrateFallback: PageLoader,
    children: [
      {
        ErrorBoundary: RouteErrorBoundary,
        children: [
          { index: true, lazy: loadDashboardPage },
          { path: "*", Component: NotFoundPage },
        ],
      },
    ],
  },
];
