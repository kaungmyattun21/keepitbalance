import { describe, expect, it } from "vitest";
import { sumMoney } from "./money.ts";

describe("sumMoney", () => {
  it("adds exactly, without float noise", () => {
    expect(sumMoney(["0.10", "0.20"])).toBe("0.30");
    expect(sumMoney(["420", "150.5", "0.05"])).toBe("570.55");
  });

  it("ignores blank and invalid amounts", () => {
    expect(sumMoney(["", " 12 ", "abc", "1.234"])).toBe("12.00");
    expect(sumMoney([])).toBe("0.00");
  });
});
