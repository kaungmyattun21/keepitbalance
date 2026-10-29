import { NavLink } from "react-router";
import { cn } from "@/shared/lib/utils";
import type { NavItem } from "../nav-item.ts";

type NavItemVariant = "sidebar" | "compact" | "bottom";

type NavItemLinkProps = {
  item: NavItem;
  variant: NavItemVariant;
};

const layoutClasses: Record<NavItemVariant, string> = {
  sidebar: "h-9 gap-3 rounded-lg px-3 text-sm",
  compact: "size-10 justify-center rounded-lg",
  bottom: "min-h-14 flex-1 flex-col justify-center gap-1 rounded-lg pt-2 pb-1.5 text-[0.7rem] font-medium",
};

const activeClasses: Record<NavItemVariant, string> = {
  sidebar: "bg-sidebar-accent font-medium text-foreground shadow-xs ring-1 ring-sidebar-border",
  compact: "bg-sidebar-accent text-foreground shadow-xs ring-1 ring-sidebar-border",
  bottom: "text-foreground",
};

const idleClasses: Record<NavItemVariant, string> = {
  sidebar: "text-muted-foreground hover:bg-sidebar-accent/70 hover:text-foreground",
  compact: "text-muted-foreground hover:bg-sidebar-accent/70 hover:text-foreground",
  bottom: "text-muted-foreground hover:text-foreground",
};

export function NavItemLink({ item, variant }: NavItemLinkProps) {
  const { label, to, icon: Icon, preload, comingSoon } = item;
  const layout = cn(
    "flex items-center transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
    layoutClasses[variant],
  );
  const hideLabel = variant === "compact";

  const renderContent = (isActive: boolean) => (
    <>
      <span
        className={cn(
          "flex items-center justify-center",
          variant === "bottom" && "h-7 w-12 rounded-full transition-colors",
          variant === "bottom" && isActive && "bg-brand-subtle",
        )}
      >
        <Icon className={cn("size-4 shrink-0", isActive && "text-brand")} aria-hidden />
      </span>
      <span className={cn(hideLabel && "sr-only")}>{label}</span>
      {comingSoon && (
        <>
          <span className="sr-only">(coming soon)</span>
          {variant === "sidebar" && (
            <span
              aria-hidden
              className="ml-auto rounded-full border px-1.5 py-px text-[0.625rem] font-medium tracking-wide uppercase"
            >
              Soon
            </span>
          )}
        </>
      )}
    </>
  );

  if (comingSoon) {
    return (
      <span
        aria-disabled="true"
        title={`${label}: coming soon`}
        className={cn(layout, "cursor-not-allowed text-muted-foreground/70")}
      >
        {renderContent(false)}
      </span>
    );
  }

  const handleIntent = preload ? () => void preload().catch(() => {}) : undefined;

  return (
    <NavLink
      to={to}
      end={to === "/"}
      title={hideLabel ? label : undefined}
      onPointerEnter={handleIntent}
      onFocus={handleIntent}
      className={({ isActive }) => cn(layout, isActive ? activeClasses[variant] : idleClasses[variant])}
    >
      {({ isActive }) => renderContent(isActive)}
    </NavLink>
  );
}
