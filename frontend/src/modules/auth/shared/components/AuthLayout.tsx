import { Scale } from "lucide-react";
import { Link, Outlet, ScrollRestoration } from "react-router";

export function AuthLayout() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted/40 px-4 py-10">
      <Link to="/" className="flex items-center gap-2 font-heading text-lg font-semibold">
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Scale className="size-4" aria-hidden />
        </span>
        KeepItBalance
      </Link>
      <main className="w-full max-w-sm">
        <Outlet />
      </main>
      <ScrollRestoration />
    </div>
  );
}
