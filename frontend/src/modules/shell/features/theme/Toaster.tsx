import type { CSSProperties } from "react";
import { Toaster as Sonner } from "sonner";
import { useThemeStore } from "./theme-store.ts";

const themedToastStyle = {
  "--normal-bg": "var(--popover)",
  "--normal-text": "var(--popover-foreground)",
  "--normal-border": "var(--border)",
  "--border-radius": "var(--radius-xl)",
} as CSSProperties;

export function Toaster() {
  const theme = useThemeStore((state) => state.theme);
  return (
    <Sonner
      theme={theme}
      position="top-center"
      closeButton
      style={themedToastStyle}
      toastOptions={{ className: "font-sans shadow-lg" }}
    />
  );
}
