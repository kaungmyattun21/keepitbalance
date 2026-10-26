import { Outlet, ScrollRestoration } from "react-router";
import { BottomNav } from "./components/BottomNav.tsx";
import { Header } from "./components/Header.tsx";
import { NavigationProgress } from "./components/NavigationProgress.tsx";
import { Sidebar } from "./components/Sidebar.tsx";
import type { NavItem } from "./nav-item.ts";

export function AppLayout({ navItems }: { navItems: NavItem[] }) {
  return (
    <div className="flex min-h-svh bg-background">
      <NavigationProgress />
      <Sidebar navItems={navItems} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <main className="flex-1 px-4 pt-6 pb-24 md:px-8 md:pb-8">
          <Outlet />
        </main>
      </div>
      <BottomNav navItems={navItems} />
      <ScrollRestoration />
    </div>
  );
}
