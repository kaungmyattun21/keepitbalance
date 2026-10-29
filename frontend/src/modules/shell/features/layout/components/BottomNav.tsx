import type { NavItem } from "../nav-item.ts";
import { NavItemLink } from "./NavItemLink.tsx";

export function BottomNav({ navItems }: { navItems: NavItem[] }) {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 flex gap-1 border-t bg-background/85 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg md:hidden"
    >
      {navItems.map((item) => (
        <NavItemLink key={item.to} item={item} variant="bottom" />
      ))}
    </nav>
  );
}
