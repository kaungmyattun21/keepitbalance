import { QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense } from "react";
import { RouterProvider } from "react-router/dom";
import { Toaster, useApplyTheme } from "@/modules/shell";
import { queryClient } from "@/shared/lib/query-client";
import { router } from "./router.ts";

const QueryDevtools = import.meta.env.DEV
  ? lazy(() =>
      import("@tanstack/react-query-devtools").then((module) => ({ default: module.ReactQueryDevtools })),
    )
  : () => null;

export function App() {
  useApplyTheme();

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster />
      <Suspense>
        <QueryDevtools buttonPosition="bottom-left" />
      </Suspense>
    </QueryClientProvider>
  );
}
