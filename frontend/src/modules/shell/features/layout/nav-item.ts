import type { LucideIcon } from "lucide-react";

export type NavItem = {
  label: string;
  to: string;
  icon: LucideIcon;
  preload?: () => Promise<unknown>;
  comingSoon?: boolean;
};
