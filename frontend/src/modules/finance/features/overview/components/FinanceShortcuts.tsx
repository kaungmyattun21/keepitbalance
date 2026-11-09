import { ArrowLeftRight, CalendarClock, ChartPie } from "lucide-react";
import { Link } from "react-router";

export function FinanceShortcuts({ month }: { month: string }) {
  return (
    <nav aria-label="Finance shortcuts" className="md:hidden">
      <ul className="grid grid-cols-3 gap-3">
        {[
          { label: "Transactions", to: `/finance/transactions?month=${month}`, icon: ArrowLeftRight },
          { label: "Budgets", to: `/finance/budgets?month=${month}`, icon: ChartPie },
          { label: "Bills", to: "/finance/bills", icon: CalendarClock },
        ].map(({ label, to, icon: Icon }) => (
          <li key={to} className="min-w-0">
            <Link
              to={to}
              className="flex min-h-24 flex-col items-center justify-center gap-2.5 rounded-2xl bg-card px-2 py-3 text-xs font-medium transition-colors outline-none hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring active:bg-brand-subtle"
            >
              <span className="grid size-9 place-items-center rounded-xl bg-brand-subtle/60 text-brand">
                <Icon className="size-4" strokeWidth={1.75} aria-hidden />
              </span>
              <span className="max-w-full text-center wrap-anywhere">{label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
