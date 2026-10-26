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
        "sticky top-0 hidden h-svh shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground transition-[width] md:flex",
        collapsed ? "w-16 items-center" : "w-60",
      )}
    >
      <div className={cn("flex h-14 items-center", collapsed ? "justify-center" : "px-4")}>
        <Brand iconOnly={collapsed} />
      </div>

      <nav aria-label="Main" className="flex flex-1 flex-col gap-1 p-2">
        {navItems.map((item) => (
          <NavItemLink key={item.to} item={item} variant={collapsed ? "compact" : "sidebar"} />
        ))}
      </nav>

      <div className="p-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
        </Button>
      </div>
    </aside>
  );
}
