import type { ReactNode } from "react";
import { ThemeToggle } from "../../theme/ThemeToggle.tsx";
import { Brand } from "./Brand.tsx";

export function Header({ actions }: { actions?: ReactNode }) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur md:px-8">
      <div className="md:hidden">
        <Brand />
      </div>
      <div className="ml-auto flex items-center gap-1">
        <ThemeToggle />
        {actions}
      </div>
    </header>
  );
}
