import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Theme = "light" | "dark" | "system";

type ThemeState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

export const THEME_STORAGE_KEY = "keepitbalance-theme";

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: "system",
      setTheme: (theme) => set({ theme }),
    }),
    { name: THEME_STORAGE_KEY, partialize: ({ theme }) => ({ theme }) },
  ),
);
