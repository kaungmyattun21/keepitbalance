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
  bottomAction?: ReactNode;
};

export function AppLayout({ navItems, headerActions, banner, bottomAction }: AppLayoutProps) {
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
          className="min-w-0 flex-1 pt-5 pr-[max(1rem,env(safe-area-inset-right))] pb-[calc(var(--app-bottom-nav-height)+1.5rem)] pl-[max(1rem,env(safe-area-inset-left))] outline-none sm:px-6 md:px-10 md:pt-10 md:pb-16"
        >
          <div className="mx-auto w-full max-w-5xl">
            {banner}
            <Outlet />
          </div>
        </main>
      </div>
      <BottomNav navItems={navItems} action={bottomAction} />
      <ScrollRestoration />
    </div>
  );
}
