import { describe, expect, it } from "vitest";
import { amountAfterKey } from "./amount-keypad.ts";

describe("amount keypad", () => {
  it("keeps decimal drafts exact, including a leading decimal point", () => {
    expect([".", "1", "0"].reduce(amountAfterKey, "")).toBe("0.10");
    expect(["0", "0", "1", "2", ".", "5"].reduce(amountAfterKey, "")).toBe("12.5");
    expect(amountAfterKey("12.", ".")).toBe("12.");
    expect(amountAfterKey("12.50", "1")).toBe("12.50");
  });
  it("supports deletion and enforces the shared money precision limit", () => {
    expect(amountAfterKey("12.50", "Backspace")).toBe("12.5");
    expect(amountAfterKey("12.50", "Delete")).toBe("");
    expect(amountAfterKey("", "Backspace")).toBe("");
    expect(amountAfterKey("9999999999", "9")).toBe("9999999999");
    expect(amountAfterKey("9999999999.", "9")).toBe("9999999999.9");
    for (const key of ["-", "+", "e", " ", "Enter"]) expect(amountAfterKey("12", key)).toBe("12");
  });
});
