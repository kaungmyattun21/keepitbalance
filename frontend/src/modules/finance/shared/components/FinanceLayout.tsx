import { Outlet } from "react-router";
import { PageHeader } from "@/shared/components/Page";
import { FinanceTabs } from "./FinanceTabs.tsx";

export function FinanceLayout() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-5">
        <PageHeader
          title="Finance"
          description="Your money at a glance, from daily spending to monthly totals."
        />
        <FinanceTabs />
      </div>
      <Outlet />
    </div>
  );
}
