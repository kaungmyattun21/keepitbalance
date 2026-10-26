import { NavLink } from "react-router";
import { cn } from "@/shared/lib/utils";
import type { NavItem } from "../nav-item.ts";

type NavItemLinkProps = {
  item: NavItem;
  variant: "sidebar" | "compact" | "bottom";
};

const variantClasses = {
  sidebar: "h-9 gap-3 rounded-md px-3 text-sm",
  compact: "size-10 justify-center rounded-md",
  bottom: "flex-1 flex-col justify-center gap-1 py-2 text-[0.7rem]",
};

export function NavItemLink({ item, variant }: NavItemLinkProps) {
  const { label, to, icon: Icon, preload, comingSoon } = item;
  const base = cn("flex items-center transition-colors", variantClasses[variant]);
  const hideLabel = variant === "compact";

  const content = (
    <>
      <Icon className="size-4 shrink-0" aria-hidden />
      <span className={cn(hideLabel && "sr-only")}>{label}</span>
      {comingSoon && variant === "sidebar" && (
        <span className="ml-auto text-[0.65rem] tracking-wide uppercase">Soon</span>
      )}
    </>
  );

  if (comingSoon) {
    return (
      <span
        aria-disabled="true"
        title={`${label}: coming soon`}
        className={cn(base, "cursor-not-allowed text-muted-foreground/60")}
      >
        {content}
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
      className={({ isActive }) =>
        cn(
          base,
          isActive
            ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
            : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
        )
      }
    >
      {content}
    </NavLink>
  );
}
