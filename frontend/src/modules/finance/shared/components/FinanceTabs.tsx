import { NavLink } from "react-router";
import { cn } from "@/shared/lib/utils";

const financeSections = [
  { label: "Overview", to: "/finance", end: true },
  { label: "Transactions", to: "/finance/transactions", end: false },
  { label: "Budgets", to: "/finance/budgets", end: false },
  { label: "Bills", to: "/finance/bills", end: false },
];

// Links that look like tabs: each section has its own URL, so this is navigation, not an ARIA tablist.
export function FinanceTabs() {
  return (
    <nav aria-label="Finance sections" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="flex min-w-max gap-1 border-b">
        {financeSections.map((section) => (
          <li key={section.to}>
            <NavLink
              to={section.to}
              end={section.end}
              className={({ isActive }) =>
                cn(
                  "relative inline-flex h-10 items-center rounded-t-md px-3 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  "after:absolute after:inset-x-3 after:-bottom-px after:h-0.5 after:rounded-full",
                  isActive
                    ? "text-foreground after:bg-brand"
                    : "text-muted-foreground after:bg-transparent hover:text-foreground",
                )
              }
            >
              {section.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
