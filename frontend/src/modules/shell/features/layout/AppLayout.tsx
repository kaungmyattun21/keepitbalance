import type { ReactNode } from "react";
import { Outlet, ScrollRestoration } from "react-router";
import { MAIN_CONTENT_ID, SkipLink } from "@/shared/components/SkipLink";
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
      <SkipLink />
      <NavigationProgress />
      <Sidebar navItems={navItems} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header actions={headerActions} />
        <main
          id={MAIN_CONTENT_ID}
          tabIndex={-1}
          className="flex-1 px-4 pt-6 pb-28 outline-none sm:px-6 md:px-10 md:pt-10 md:pb-16"
        >
          <div className="mx-auto w-full max-w-5xl">
            {banner}
            <Outlet />
          </div>
        </main>
      </div>
      <BottomNav navItems={navItems} />
      <ScrollRestoration />
    </div>
  );
}
