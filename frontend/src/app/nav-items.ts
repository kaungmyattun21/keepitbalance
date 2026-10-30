import { HeartPulse, LayoutDashboard, UtensilsCrossed, Wallet } from "lucide-react";
import { lazyShoppingListPage } from "@/modules/groceries";
import { lazyDashboardPage } from "@/modules/dashboard";
import { lazyFinanceOverviewPage } from "@/modules/finance";
import type { NavItem } from "@/modules/shell";

type LazyPage = () => Promise<{ loader: () => Promise<unknown> }>;

const preloadPage = (lazyPage: LazyPage) => () => lazyPage().then((page) => page.loader());

export const navItems: NavItem[] = [
  { label: "Dashboard", to: "/", icon: LayoutDashboard, preload: preloadPage(lazyDashboardPage) },
  { label: "Finance", to: "/finance", icon: Wallet, preload: preloadPage(lazyFinanceOverviewPage) },
  { label: "Groceries", to: "/meals", icon: UtensilsCrossed, preload: preloadPage(lazyShoppingListPage) },
  { label: "Health", to: "/health", icon: HeartPulse, comingSoon: true },
];
