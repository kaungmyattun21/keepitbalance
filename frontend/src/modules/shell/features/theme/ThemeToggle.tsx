import { Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { useThemeStore, type Theme } from "./theme-store.ts";

const themes = {
  light: { next: "dark", icon: Sun },
  dark: { next: "system", icon: Moon },
  system: { next: "light", icon: Monitor },
} satisfies Record<Theme, { next: Theme; icon: typeof Sun }>;

export function ThemeToggle() {
  const theme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);
  const { next, icon: Icon } = themes[theme];

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(next)}
      aria-label={`Theme: ${theme}. Switch to ${next}`}
      title={`Theme: ${theme}`}
    >
      <Icon />
    </Button>
  );
}
