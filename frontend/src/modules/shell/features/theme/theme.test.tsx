// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { THEME_STORAGE_KEY, useThemeStore } from "./theme-store.ts";
import { ThemeToggle } from "./ThemeToggle.tsx";
import { useApplyTheme } from "./use-apply-theme.ts";

function ThemeHarness() {
  useApplyTheme();
  return <ThemeToggle />;
}

const isDark = () => document.documentElement.classList.contains("dark");

beforeEach(() => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
  useThemeStore.setState({ theme: "dark" });
  document.documentElement.classList.remove("dark");
});

it("starts dark, cycles dark → system → light, applies it, and remembers it", async () => {
  render(<ThemeHarness />);
  const toggle = () => userEvent.click(screen.getByRole("button", { name: /^Theme:/ }));

  expect(useThemeStore.getState().theme).toBe("dark");
  expect(isDark()).toBe(true);

  await toggle();
  expect(useThemeStore.getState().theme).toBe("system");
  expect(isDark()).toBe(false);

  await toggle();
  expect(useThemeStore.getState().theme).toBe("light");
  expect(isDark()).toBe(false);
  expect(JSON.parse(localStorage.getItem(THEME_STORAGE_KEY)!).state.theme).toBe("light");

  await toggle();
  expect(useThemeStore.getState().theme).toBe("dark");
  expect(isDark()).toBe(true);
});
