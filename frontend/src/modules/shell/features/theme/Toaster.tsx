import { Toaster as Sonner } from "sonner";
import { useThemeStore } from "./theme-store.ts";

export function Toaster() {
  const theme = useThemeStore((state) => state.theme);
  return <Sonner theme={theme} position="top-center" richColors closeButton />;
}
