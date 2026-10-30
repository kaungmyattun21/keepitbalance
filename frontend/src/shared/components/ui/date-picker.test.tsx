// @vitest-environment jsdom
import { useState } from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { DatePicker } from "./date-picker";

function Example() {
  const [value, setValue] = useState("2026-10-15");
  return (
    <>
      <label htmlFor="date">Date</label>
      <DatePicker id="date" label="Date" value={value} onChange={setValue} />
    </>
  );
}

afterEach(cleanup);

describe("date picker", () => {
  it("selects a calendar day without changing its date and restores focus", async () => {
    render(<Example />);
    const trigger = screen.getByRole("button", { name: "Open calendar for Date" });
    await userEvent.click(trigger);
    const day = await screen.findByRole("button", { name: /October 20th, 2026/ }, { timeout: 3000 });
    await userEvent.click(day);
    expect((screen.getByLabelText("Date") as HTMLInputElement).value).toBe("2026-10-20");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(document.activeElement).toBe(trigger);
  });

  it("accepts typed dates and dismisses the calendar with Escape", async () => {
    render(<Example />);
    const input = screen.getByLabelText("Date");
    await userEvent.clear(input);
    await userEvent.type(input, "2028-02-29");
    await userEvent.click(screen.getByRole("button", { name: "Open calendar for Date" }));
    expect(await screen.findByRole("button", { name: /February 29th, 2028, selected/ })).toBeTruthy();
    await userEvent.keyboard("{Escape}");
    expect((input as HTMLInputElement).value).toBe("2028-02-29");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("supports month navigation and keyboard day selection", async () => {
    render(<Example />);
    await userEvent.click(screen.getByRole("button", { name: "Open calendar for Date" }));
    await screen.findByRole("button", { name: /October 15th, 2026, selected/ });
    await userEvent.keyboard("{ArrowRight}{Enter}");
    expect((screen.getByLabelText("Date") as HTMLInputElement).value).toBe("2026-10-16");
    await userEvent.click(screen.getByRole("button", { name: "Open calendar for Date" }));
    await userEvent.click(await screen.findByRole("button", { name: "Go to the Next Month" }));
    expect(screen.getByRole("grid", { name: "November 2026" })).toBeTruthy();
  });
});
