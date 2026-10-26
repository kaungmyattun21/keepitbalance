import { HeartPulse, LayoutDashboard, UtensilsCrossed, Wallet } from "lucide-react";
import { loadDashboardPage } from "@/modules/dashboard";
import type { NavItem } from "@/modules/shell";

export const navItems: NavItem[] = [
  {
    label: "Dashboard",
    to: "/",
    icon: LayoutDashboard,
    preload: () => loadDashboardPage().then((module) => module.loader()),
  },
  { label: "Finance", to: "/finance", icon: Wallet, comingSoon: true },
  { label: "Meals", to: "/meals", icon: UtensilsCrossed, comingSoon: true },
  { label: "Health", to: "/health", icon: HeartPulse, comingSoon: true },
];
