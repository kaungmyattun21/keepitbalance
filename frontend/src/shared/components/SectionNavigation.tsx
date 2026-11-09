import { NavLink } from "react-router";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/shared/lib/utils";

type SectionLink = { to: string; label: string; end?: boolean; icon?: LucideIcon };

export function SectionNavigation({ label, items }: { label: string; items: SectionLink[] }) {
  return (
    <nav
      aria-label={label}
      className="@container/sections sticky top-(--app-mobile-header-height) z-20 w-full max-w-full min-w-0 bg-background/95 py-1 backdrop-blur-xl md:static md:z-auto md:bg-transparent md:backdrop-blur-none"
    >
      <ul
        className={cn(
          "grid gap-1 rounded-2xl border border-border/60 bg-muted/60 p-1",
          items.length > 4
            ? "grid-cols-3 @3xl/sections:flex @3xl/sections:w-fit @3xl/sections:rounded-full"
            : "auto-cols-fr grid-flow-col @lg/sections:flex @lg/sections:w-fit @lg/sections:rounded-full",
        )}
      >
        {items.map(({ to, label: title, end, icon: Icon }) => (
          <li key={to} className="min-w-0">
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "flex h-full min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[0.6875rem] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  items.length > 4
                    ? "@3xl/sections:min-h-0 @3xl/sections:flex-row @3xl/sections:gap-2 @3xl/sections:rounded-full @3xl/sections:px-3.5 @3xl/sections:py-2 @3xl/sections:text-sm"
                    : "@lg/sections:min-h-0 @lg/sections:flex-row @lg/sections:gap-2 @lg/sections:rounded-full @lg/sections:px-3.5 @lg/sections:py-2 @lg/sections:text-sm",
                  isActive
                    ? "bg-card text-brand"
                    : "text-muted-foreground hover:bg-card/60 hover:text-foreground",
                )
              }
            >
              {Icon && <Icon className="size-3.5 shrink-0" aria-hidden />}
              <span className="min-w-0 text-center wrap-anywhere">{title}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
