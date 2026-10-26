import type { RouteObject } from "react-router";
import {
  AuthLayout,
  guestOnly,
  loadForgotPasswordPage,
  loadLoginPage,
  loadResetPasswordPage,
  loadSignupPage,
  loadVerifiedPage,
  requireSession,
} from "@/modules/auth";
import { loadDashboardPage } from "@/modules/dashboard";
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
          { index: true, lazy: loadDashboardPage },
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
          { path: "login", lazy: loadLoginPage },
          { path: "signup", lazy: loadSignupPage },
          { path: "forgot-password", lazy: loadForgotPasswordPage },
        ],
      },
      { path: "reset-password", lazy: loadResetPasswordPage },
      { path: "verified", lazy: loadVerifiedPage },
    ],
  },
];
