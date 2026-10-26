import type { ReactNode } from "react";
import { Outlet, ScrollRestoration } from "react-router";
import { BottomNav } from "./components/BottomNav.tsx";
import { Header } from "./components/Header.tsx";
import { NavigationProgress } from "./components/NavigationProgress.tsx";
import { Sidebar } from "./components/Sidebar.tsx";
import type { NavItem } from "./nav-item.ts";

type AppLayoutProps = {
  navItems: NavItem[];
  headerActions?: ReactNode;
  banner?: ReactNode;
};

export function AppLayout({ navItems, headerActions, banner }: AppLayoutProps) {
  return (
    <div className="flex min-h-svh bg-background">
      <NavigationProgress />
      <Sidebar navItems={navItems} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header actions={headerActions} />
        <main className="flex-1 px-4 pt-6 pb-24 md:px-8 md:pb-8">
          {banner}
          <Outlet />
        </main>
      </div>
      <BottomNav navItems={navItems} />
      <ScrollRestoration />
    </div>
  );
}
