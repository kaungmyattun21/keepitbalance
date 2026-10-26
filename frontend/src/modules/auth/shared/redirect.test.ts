import { describe, expect, it } from "vitest";
import { loginPathFor, safeRedirectPath } from "./redirect.ts";

describe("safeRedirectPath", () => {
  it("keeps in-app paths with their search params", () => {
    expect(safeRedirectPath("/finance?month=2026-09")).toBe("/finance?month=2026-09");
  });

  it.each([null, "", "https://evil.example", "//evil.example", "/\\evil.example", "finance"])(
    "falls back to / for %s",
    (value) => {
      expect(safeRedirectPath(value)).toBe("/");
    },
  );

  it("never redirects back into the auth pages", () => {
    expect(safeRedirectPath("/login?redirectTo=/x")).toBe("/");
    expect(safeRedirectPath("/signup")).toBe("/");
  });
});

describe("loginPathFor", () => {
  it("remembers the page the visitor wanted", () => {
    expect(loginPathFor(new URL("http://app/finance?month=2026-09"))).toBe(
      "/login?redirectTo=%2Ffinance%3Fmonth%3D2026-09",
    );
  });

  it("adds nothing for the home page", () => {
    expect(loginPathFor(new URL("http://app/"))).toBe("/login");
  });
});
