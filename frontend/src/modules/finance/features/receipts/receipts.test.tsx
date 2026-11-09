// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReceiptDetail } from "@keepitbalance/shared/receipts";
import { createFetchMock, json } from "@/shared/test/fetch-mock";
import { ReceiptImports } from "./ReceiptImports.tsx";

const server = createFetchMock();
let client: QueryClient;
const id = "11111111-1111-4111-8111-111111111111";
const category = {
  id: "22222222-2222-4222-8222-222222222222",
  groupId: "33333333-3333-4333-8333-333333333333",
  name: "Groceries",
  type: "expense" as const,
  icon: null,
};
let receipt: ReceiptDetail;
function renderImports() {
  render(
    <QueryClientProvider client={client}>
      <ReceiptImports categories={[category]} />
    </QueryClientProvider>,
  );
}
const photo = () => new File(["fake image bytes"], "receipt.png", { type: "image/png" });

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
  Element.prototype.hasPointerCapture = vi.fn(() => false);
  Element.prototype.releasePointerCapture = vi.fn();
});
beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  receipt = {
    id,
    extractionVersion: 1,
    status: "needs_review",
    draft: {
      merchant: "Fresh Market",
      date: "2026-11-09",
      total: "6.05",
      warnings: ["Check suggested details."],
    },
    error: null,
    rawText: "TOTAL 6.05",
    transactionId: null,
    imageUrl: `/receipts/${id}/image`,
    createdAt: "2026-11-09T00:00:00.000Z",
  };
  vi.stubGlobal("fetch", server.fetch);
  server.on("GET /api/v1/receipts", () =>
    json(200, { data: [receipt], page: 1, pageSize: 5, total: 1, totalPages: 1 }),
  );
  server.on(`GET /api/v1/receipts/${id}`, () => json(200, { data: receipt }));
});
afterEach(() => {
  cleanup();
  client.clear();
  server.reset();
  vi.unstubAllGlobals();
});

describe("receipt imports", () => {
  it("opens an existing receipt after a duplicate upload and confirms reviewed values", async () => {
    server.on("POST /api/v1/receipts", () => json(200, { data: receipt, duplicate: true }));
    server.on(`POST /api/v1/receipts/${id}/confirm`, async (request) => {
      expect(await request.json()).toMatchObject({
        merchant: "Fresh Market",
        amount: "7.05",
        date: "2026-11-09",
        categoryId: category.id,
      });
      receipt = { ...receipt, status: "confirmed", transactionId: "transaction-1" };
      return json(200, { data: receipt });
    });
    renderImports();
    await userEvent.upload(screen.getByLabelText("Upload receipt"), photo());
    const dialog = await screen.findByRole("dialog");
    const amount = await within(dialog).findByLabelText("Purchase total");
    await userEvent.clear(amount);
    await userEvent.type(amount, "7.05");
    await userEvent.click(within(dialog).getByLabelText("Expense category"));
    await userEvent.click(await screen.findByRole("option", { name: "Groceries" }));
    await userEvent.click(within(dialog).getByRole("button", { name: "Save purchase" }));
    expect(await within(dialog).findByText(/Purchase recorded/)).toBeTruthy();
    expect(server.calls(`POST /api/v1/receipts/${id}/confirm`)).toHaveLength(1);
    expect(within(dialog).queryByRole("button", { name: "Save purchase" })).toBeNull();
  });

  it("keeps processing independent of the open dialog and restores it on reopening", async () => {
    receipt = { ...receipt, status: "queued", draft: null, rawText: null };
    renderImports();
    await userEvent.click(await screen.findByRole("button", { name: /Receipt upload/ }));
    expect(await screen.findByText("Waiting to process")).toBeTruthy();
    await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Close" }));
    receipt = {
      ...receipt,
      status: "needs_review",
      draft: { merchant: "Finished shop", date: null, total: "6.05", warnings: [] },
    };
    await client.invalidateQueries({ queryKey: ["finance", "receipts"] });
    await userEvent.click(await screen.findByRole("button", { name: /Finished shop/ }));
    expect(await screen.findByLabelText("Purchase total")).toBeTruthy();
    expect((screen.getByLabelText("Purchase date") as HTMLInputElement).value).toBe("");
  });

  it("shows retry errors and allows retrying failed extraction", async () => {
    receipt = { ...receipt, status: "failed", error: "Couldn't read receipt.", draft: null };
    server.on(`POST /api/v1/receipts/${id}/retry`, () =>
      json(503, { error: { code: "INTERNAL_ERROR", message: "Try again later." } }),
    );
    renderImports();
    await userEvent.click(await screen.findByRole("button", { name: /Receipt upload/ }));
    await userEvent.click(await screen.findByRole("button", { name: "Retry extraction" }));
    expect(await screen.findByText("Try again later.")).toBeTruthy();
    expect(screen.getByLabelText("Purchase total")).toBeTruthy();
    server.on(`POST /api/v1/receipts/${id}/retry`, () => {
      receipt = { ...receipt, status: "queued", error: null };
      return json(202, { data: receipt });
    });
    await userEvent.click(screen.getByRole("button", { name: "Retry extraction" }));
    expect(await screen.findByText("Waiting to process")).toBeTruthy();
  });

  it("rejects oversized uploads before sending a request", async () => {
    renderImports();
    await userEvent.upload(
      screen.getByLabelText("Upload receipt"),
      new File([new Uint8Array(5 * 1024 * 1024 + 1)], "large.png", { type: "image/png" }),
    );
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("up to 5 MB"));
    expect(server.calls("POST /api/v1/receipts")).toHaveLength(0);
  });

  it("reprocesses an existing draft and replaces the old suggestions", async () => {
    server.on(`POST /api/v1/receipts/${id}/retry`, () => {
      receipt = { ...receipt, status: "queued", extractionVersion: 2 };
      return json(202, { data: receipt });
    });
    renderImports();
    await userEvent.click(await screen.findByRole("button", { name: /Fresh Market/ }));
    await userEvent.click(await screen.findByRole("button", { name: "Reprocess receipt" }));
    expect(await screen.findByText("Waiting to process")).toBeTruthy();
    expect(screen.queryByLabelText("Purchase total")).toBeNull();
    receipt = {
      ...receipt,
      status: "needs_review",
      draft: { merchant: "Costco", date: "2026-11-09", total: "25.00", warnings: [] },
    };
    await client.invalidateQueries({ queryKey: ["finance", "receipts"] });
    expect(((await screen.findByLabelText("Purchase total")) as HTMLInputElement).value).toBe("25.00");
    expect((screen.getByLabelText("Merchant") as HTMLInputElement).value).toBe("Costco");
  });
});
