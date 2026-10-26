import { useEffect } from "react";
import { useThemeStore } from "./theme-store.ts";

export function useApplyTheme() {
  const theme = useThemeStore((state) => state.theme);

  useEffect(() => {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const dark = theme === "dark" || (theme === "system" && prefersDark.matches);
      document.documentElement.classList.toggle("dark", dark);
    };

    apply();
    if (theme !== "system") return;
    prefersDark.addEventListener("change", apply);
    return () => prefersDark.removeEventListener("change", apply);
  }, [theme]);
}
