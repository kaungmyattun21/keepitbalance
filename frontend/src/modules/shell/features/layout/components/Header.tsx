import type { ReactNode } from "react";
import { ThemeToggle } from "../../theme/ThemeToggle.tsx";
import { Brand } from "./Brand.tsx";

export function Header({ actions }: { actions?: ReactNode }) {
  return (
    <header className="sticky top-0 z-30 flex h-(--app-mobile-header-height) shrink-0 items-center gap-2 border-b border-border/50 bg-background/95 pt-[env(safe-area-inset-top)] pr-[max(1rem,env(safe-area-inset-right))] pl-[max(1rem,env(safe-area-inset-left))] backdrop-blur-xl sm:px-6 md:h-20 md:px-10 md:pt-0">
      <div className="flex min-h-11 min-w-0 flex-1 items-center md:hidden [&_a]:min-h-11">
        <Brand />
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-1 md:gap-1.5 [&_[data-slot=button]]:size-11 md:[&_[data-slot=button]]:size-9">
        <ThemeToggle />
        {actions}
      </div>
    </header>
  );
}
