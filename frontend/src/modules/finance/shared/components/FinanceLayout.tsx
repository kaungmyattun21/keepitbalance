import { Outlet } from "react-router";
import { PageHeader } from "@/shared/components/Page";
import { FinanceTabs } from "./FinanceTabs.tsx";

export function FinanceLayout() {
  return (
    <div className="@container/finance flex w-full min-w-0 flex-col gap-4 sm:gap-8">
      <PageHeader
        title="Finance"
        description="Your money at a glance, from daily spending to monthly totals."
      />
      <FinanceTabs />
      <Outlet />
    </div>
  );
}
