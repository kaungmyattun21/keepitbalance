import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";
import { useLayoutStore } from "../layout-store.ts";
import type { NavItem } from "../nav-item.ts";
import { Brand } from "./Brand.tsx";
import { NavItemLink } from "./NavItemLink.tsx";

export function Sidebar({ navItems }: { navItems: NavItem[] }) {
  const collapsed = useLayoutStore((state) => state.sidebarCollapsed);
  const toggleSidebar = useLayoutStore((state) => state.toggleSidebar);

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-svh shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-out md:flex",
        collapsed ? "w-[4.5rem] items-center" : "w-64",
      )}
    >
      <div className={cn("flex h-16 items-center", collapsed ? "justify-center" : "px-5")}>
        <Brand iconOnly={collapsed} />
      </div>

      <nav aria-label="Main" className={cn("flex flex-1 flex-col gap-0.5 py-3", collapsed ? "px-2" : "px-3")}>
        {navItems.map((item) => (
          <NavItemLink key={item.to} item={item} variant={collapsed ? "compact" : "sidebar"} />
        ))}
      </nav>

      <div className={cn("py-3", collapsed ? "px-2" : "px-3")}>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground"
          onClick={toggleSidebar}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
        >
          {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
        </Button>
      </div>
    </aside>
  );
}
