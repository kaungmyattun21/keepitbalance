import type { ReactNode } from "react";
import { ThemeToggle } from "../../theme/ThemeToggle.tsx";
import { Brand } from "./Brand.tsx";

export function Header({ actions }: { actions?: ReactNode }) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b bg-background/85 px-4 backdrop-blur-lg sm:px-6 md:px-10">
      <div className="md:hidden">
        <Brand />
      </div>
      <div className="ml-auto flex items-center gap-1.5">
        <ThemeToggle />
        {actions}
      </div>
    </header>
  );
}
