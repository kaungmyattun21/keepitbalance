import { Link, Outlet, ScrollRestoration } from "react-router";
import { BrandMark } from "@/shared/components/BrandMark";
import { MAIN_CONTENT_ID, SkipLink } from "@/shared/components/SkipLink";

export function AuthLayout() {
  return (
    <div className="relative isolate flex min-h-svh flex-col items-center justify-center overflow-hidden bg-background px-4 py-12">
      <SkipLink />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[32rem] bg-[radial-gradient(ellipse_60%_100%_at_50%_0%,var(--brand-subtle),transparent)]"
      />
      <div className="flex w-full max-w-[25rem] flex-col items-center gap-8">
        <Link
          to="/"
          className="flex items-center gap-2.5 rounded-lg font-heading text-lg font-semibold tracking-tight outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <BrandMark className="size-9" />
          KeepItBalance
        </Link>
        <main id={MAIN_CONTENT_ID} tabIndex={-1} className="w-full outline-none">
          <Outlet />
        </main>
        <p className="text-center text-xs text-muted-foreground">Money, meals and health, in balance.</p>
      </div>
      <ScrollRestoration />
    </div>
  );
}
