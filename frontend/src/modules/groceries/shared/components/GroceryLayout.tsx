import { NavLink, Outlet } from "react-router";
import { PageHeader } from "@/shared/components/Page";
import { cn } from "@/shared/lib/utils";

export function GroceryLayout() {
  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        title="Groceries"
        description="Plan your shopping, keep track of pantry stock and record grocery spending in one place."
      />
      <nav aria-label="Grocery sections" className="overflow-x-auto">
        <div className="flex min-w-max gap-1 border-b">
          {[
            { to: "/meals", label: "Shopping list", end: true },
            { to: "/meals/pantry", label: "Pantry" },
            { to: "/meals/ingredients", label: "Ingredients" },
            { to: "/meals/history", label: "History" },
          ].map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                cn(
                  "border-b-2 px-3 py-2 text-sm font-medium",
                  isActive
                    ? "border-brand text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </div>
      </nav>
      <Outlet />
    </div>
  );
}
