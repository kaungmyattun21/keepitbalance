import { ArrowLeftRight, CalendarClock, ChartPie, LayoutGrid } from "lucide-react";
import { SectionNavigation } from "@/shared/components/SectionNavigation";

const financeSections = [
  { label: "Overview", to: "/finance", end: true, icon: LayoutGrid },
  { label: "Transactions", to: "/finance/transactions", icon: ArrowLeftRight },
  { label: "Budgets", to: "/finance/budgets", icon: ChartPie },
  { label: "Bills", to: "/finance/bills", icon: CalendarClock },
];

export function FinanceTabs() {
  return <SectionNavigation label="Finance sections" items={financeSections} />;
}
