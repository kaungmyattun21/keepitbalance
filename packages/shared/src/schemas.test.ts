import { describe, expect, it } from "vitest";
import { isValidTimezone } from "./auth.ts";
import {
  calendarDateSchema,
  emailSchema,
  moneySchema,
  monthSchema,
  paginationQuerySchema,
  passwordSchema,
  timezoneSchema,
} from "./schemas.ts";

describe("passwordSchema", () => {
  it("accepts 8 to 128 characters", () => {
    expect(passwordSchema.safeParse("x".repeat(8)).success).toBe(true);
    expect(passwordSchema.safeParse("x".repeat(128)).success).toBe(true);
  });

  it("explains passwords that are too short or too long", () => {
    expect(passwordSchema.safeParse("short").error?.issues[0]?.message).toBe(
      "Password must be at least 8 characters.",
    );
    expect(passwordSchema.safeParse("x".repeat(129)).error?.issues[0]?.message).toBe(
      "Password must be at most 128 characters.",
    );
  });
});

describe("emailSchema", () => {
  it("rejects malformed addresses", () => {
    expect(emailSchema.safeParse("kaung@example.com").success).toBe(true);
    expect(emailSchema.safeParse("kaung@").success).toBe(false);
  });
});

describe("timezone", () => {
  it("accepts names Intl.supportedValuesOf leaves out", () => {
    expect(isValidTimezone("UTC")).toBe(true);
    expect(isValidTimezone("Asia/Yangon")).toBe(true);
    expect(timezoneSchema.safeParse("Mars/Base").success).toBe(false);
  });
});

describe("moneySchema", () => {
  it("normalizes to two decimals without floats", () => {
    expect(moneySchema.parse("5")).toBe("5.00");
    expect(moneySchema.parse("12.5")).toBe("12.50");
    expect(moneySchema.parse("9999999999.99")).toBe("9999999999.99");
  });

  it.each(["", "1.234", "-5", "01", "1e3", "12,50", "12345678901"])("rejects %j", (value) => {
    expect(moneySchema.safeParse(value).success).toBe(false);
  });
});

describe("calendarDateSchema", () => {
  it("accepts real days only", () => {
    expect(calendarDateSchema.safeParse("2026-02-28").success).toBe(true);
    expect(calendarDateSchema.safeParse("2028-02-29").success).toBe(true);
    expect(calendarDateSchema.safeParse("2026-02-29").success).toBe(false);
    expect(calendarDateSchema.safeParse("2026-13-01").success).toBe(false);
    expect(calendarDateSchema.safeParse("2026-09-27T00:00:00Z").success).toBe(false);
  });
});

describe("monthSchema", () => {
  it("accepts YYYY-MM", () => {
    expect(monthSchema.safeParse("2026-09").success).toBe(true);
    expect(monthSchema.safeParse("2026-9").success).toBe(false);
    expect(monthSchema.safeParse("2026-00").success).toBe(false);
  });
});

describe("paginationQuerySchema", () => {
  it("coerces query strings and applies defaults", () => {
    expect(paginationQuerySchema.parse({})).toEqual({ page: 1, pageSize: 20 });
    expect(paginationQuerySchema.parse({ page: "3", pageSize: "50" })).toEqual({ page: 3, pageSize: 50 });
    expect(paginationQuerySchema.safeParse({ pageSize: "101" }).success).toBe(false);
  });
});
