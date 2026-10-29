import type { RouteObject } from "react-router";
import {
  AuthLayout,
  guestOnly,
  lazyForgotPasswordPage,
  lazyLoginPage,
  lazyResetPasswordPage,
  lazySignupPage,
  lazyVerifiedPage,
  requireSession,
} from "@/modules/auth";
import { lazyDashboardPage } from "@/modules/dashboard";
import { financeRoute } from "@/modules/finance";
import { NotFoundPage, PageLoader, RouteErrorBoundary } from "@/modules/shell";
import { AppShell } from "./AppShell.tsx";

export const routes: RouteObject[] = [
  {
    path: "/",
    middleware: [requireSession],
    Component: AppShell,
    ErrorBoundary: RouteErrorBoundary,
    HydrateFallback: PageLoader,
    children: [
      {
        ErrorBoundary: RouteErrorBoundary,
        children: [
          { index: true, lazy: lazyDashboardPage },
          financeRoute,
          { path: "*", Component: NotFoundPage },
        ],
      },
    ],
  },
  {
    Component: AuthLayout,
    ErrorBoundary: RouteErrorBoundary,
    HydrateFallback: PageLoader,
    children: [
      {
        middleware: [guestOnly],
        children: [
          { path: "login", lazy: lazyLoginPage },
          { path: "signup", lazy: lazySignupPage },
          { path: "forgot-password", lazy: lazyForgotPasswordPage },
        ],
      },
      { path: "reset-password", lazy: lazyResetPasswordPage },
      { path: "verified", lazy: lazyVerifiedPage },
    ],
  },
];
