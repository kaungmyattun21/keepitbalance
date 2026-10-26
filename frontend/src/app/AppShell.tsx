import { AppLayout } from "@/modules/shell";
import { navItems } from "./nav-items.ts";

export function AppShell() {
  return <AppLayout navItems={navItems} />;
}
