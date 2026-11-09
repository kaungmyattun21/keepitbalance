import { Link, Outlet, useLocation, useSearchParams } from "react-router";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/shared/components/Page";
import { FinanceTabs } from "./FinanceTabs.tsx";

export function FinanceLayout() {
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const month = params.get("month");
  const overview = month ? `/finance?${new URLSearchParams({ month })}` : "/finance";
  return (
    <div className="@container/finance flex w-full min-w-0 flex-col gap-4 sm:gap-8">
      <div className="[&_p]:hidden md:[&_p]:block">
        <PageHeader
          title="Finance"
          description="Your money at a glance, from daily spending to monthly totals."
        />
      </div>
      <div className="hidden md:block">
        <FinanceTabs />
      </div>
      {pathname.replace(/\/$/, "") !== "/finance" && (
        <Link
          to={overview}
          className="inline-flex min-h-10 w-fit items-center gap-2 rounded-lg text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring md:hidden"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Finance overview
        </Link>
      )}
      <Outlet />
    </div>
  );
}
