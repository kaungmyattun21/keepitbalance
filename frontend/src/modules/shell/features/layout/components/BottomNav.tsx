import type { ReactNode } from "react";
import type { NavItem } from "../nav-item.ts";
import { NavItemLink } from "./NavItemLink.tsx";

export function BottomNav({ navItems, action }: { navItems: NavItem[]; action?: ReactNode }) {
  const middle = Math.ceil(navItems.length / 2);
  return (
    <nav
      aria-label="Main"
      data-slot="bottom-navigation"
      className="fixed inset-x-0 bottom-0 z-40 flex h-(--app-bottom-nav-height) items-center gap-1 border-t border-border/60 bg-card/95 pt-1 pr-[max(0.5rem,env(safe-area-inset-right))] pb-[max(0.25rem,env(safe-area-inset-bottom))] pl-[max(0.5rem,env(safe-area-inset-left))] backdrop-blur-xl md:hidden"
    >
      {navItems.slice(0, middle).map((item) => (
        <NavItemLink key={item.to} item={item} variant="bottom" />
      ))}
      {action && <div className="flex min-h-16 min-w-0 flex-1 items-center justify-center">{action}</div>}
      {navItems.slice(middle).map((item) => (
        <NavItemLink key={item.to} item={item} variant="bottom" />
      ))}
    </nav>
  );
}
