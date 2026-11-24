// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReceiptDetail } from "@keepitbalance/shared/receipts";
import type { Transaction } from "@keepitbalance/shared/finance";
import { createFetchMock, json } from "@/shared/test/fetch-mock";
import { financeKeys } from "../../shared/query-keys.ts";
import { TransactionForm } from "../transactions/components/TransactionForm.tsx";
import { TransactionDetailsDialog } from "../transactions/components/TransactionDetailsDialog.tsx";

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
const onSaved = vi.fn();
const photo = () => new File(["fake image bytes"], "receipt.png", { type: "image/png" });
function transactionFixture(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    type: "expense",
    amount: "6.05",
    date: "2026-11-09",
    category,
    note: "Fresh Market",
    shoppingListId: null,
    receipt: null,
    createdAt: "2026-11-09T00:00:00.000Z",
    updatedAt: "2026-11-09T00:00:00.000Z",
    ...overrides,
  };
}
function renderForm(transaction?: Transaction) {
  return render(
    <QueryClientProvider client={client}>
      <TransactionForm
        categories={[category]}
        today="2026-11-11"
        transaction={transaction}
        onSaved={onSaved}
      />
    </QueryClientProvider>,
  );
}
async function upload() {
  await userEvent.click(screen.getByRole("button", { name: "Add receipt" }));
  await userEvent.upload(screen.getByLabelText("Upload receipt"), photo());
}
async function chooseCategory() {
  await userEvent.click(screen.getByLabelText("Category"));
  await userEvent.click(await screen.findByRole("option", { name: "Groceries" }));
}

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
  Element.prototype.hasPointerCapture = vi.fn(() => false);
  Element.prototype.releasePointerCapture = vi.fn();
});
beforeEach(() => {
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } },
  });
  client.setQueryData(financeKeys.categoryGroups(), [
    { id: category.groupId, name: "Essentials", type: "expense", categories: [category] },
  ]);
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
  server.on("POST /api/v1/receipts", () => json(202, { data: receipt, duplicate: false }));
  server.on("POST /api/v1/transactions", async (request) =>
    json(201, transactionFixture({ ...(await request.json()), receipt: { id, imageUrl: receipt.imageUrl } })),
  );
});
afterEach(() => {
  cleanup();
  client.clear();
  server.reset();
  onSaved.mockClear();
  vi.unstubAllGlobals();
});

describe("receipt in the transaction form", () => {
  it("applies scan suggestions on request and saves the edited transaction with its receipt", async () => {
    renderForm();
    await userEvent.type(screen.getByLabelText("Amount"), "12");
    await upload();
    await screen.findByRole("button", { name: "Use scanned details" });
    expect((screen.getByLabelText("Amount") as HTMLInputElement).value).toBe("12");
    await userEvent.click(screen.getByRole("button", { name: "Use scanned details" }));
    expect((screen.getByLabelText("Amount") as HTMLInputElement).value).toBe("6.05");
    expect((screen.getByLabelText("Date") as HTMLInputElement).value).toBe("2026-11-09");
    expect((screen.getByLabelText("Note") as HTMLTextAreaElement).value).toBe("Fresh Market");
    await userEvent.clear(screen.getByLabelText("Amount"));
    await userEvent.type(screen.getByLabelText("Amount"), "7.05");
    await chooseCategory();
    await userEvent.click(screen.getByRole("button", { name: "Add transaction" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    expect(await server.calls("POST /api/v1/transactions")[0]!.json()).toMatchObject({
      receiptId: id,
      amount: "7.05",
      date: "2026-11-09",
      note: "Fresh Market",
      categoryId: category.id,
    });
    expect(server.calls(`POST /api/v1/receipts/${id}/confirm`)).toHaveLength(0);
    expect(screen.queryByAltText("Attached receipt")).toBeNull();
  });

  it("saves manually entered values without waiting for OCR", async () => {
    receipt = { ...receipt, status: "queued", draft: null, rawText: null };
    renderForm();
    await upload();
    await screen.findByText(/Scanning receipt/);
    await userEvent.type(screen.getByLabelText("Amount"), "25");
    await chooseCategory();
    await userEvent.click(screen.getByRole("button", { name: "Add transaction" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(await server.calls("POST /api/v1/transactions")[0]!.json()).toMatchObject({
      amount: "25.00",
      receiptId: id,
    });
  });

  it("resumes an unfinished receipt inline, retries, and preserves manual edits", async () => {
    receipt = { ...receipt, status: "failed", draft: null, error: "Scan failed." };
    server.on(`POST /api/v1/receipts/${id}/retry`, () => {
      receipt = { ...receipt, status: "queued", error: null, extractionVersion: 2 };
      return json(202, { data: receipt });
    });
    renderForm();
    await userEvent.type(screen.getByLabelText("Amount"), "42");
    await userEvent.click(screen.getByRole("button", { name: "Add receipt" }));
    await userEvent.click(screen.getByRole("button", { name: "Continue an earlier receipt" }));
    await userEvent.click(await screen.findByRole("button", { name: /Receipt ·/ }));
    await userEvent.click(await screen.findByRole("button", { name: "Retry scan" }));
    expect(await screen.findByText(/Scanning receipt/)).toBeTruthy();
    expect((screen.getByLabelText("Amount") as HTMLInputElement).value).toBe("42");
    expect(new URL(server.calls("GET /api/v1/receipts")[0]!.url).searchParams.get("unconfirmed")).toBe(
      "true",
    );
  });

  it("refuses to attach a receipt already used by another transaction", async () => {
    receipt = { ...receipt, status: "confirmed", transactionId: "other-transaction" };
    renderForm();
    await upload();
    expect(await screen.findByText(/already attached to another transaction/)).toBeTruthy();
    expect(screen.queryByAltText("Attached receipt")).toBeNull();
  });

  it("rejects oversized uploads before sending a request", async () => {
    renderForm();
    await userEvent.click(screen.getByRole("button", { name: "Add receipt" }));
    await userEvent.upload(
      screen.getByLabelText("Upload receipt"),
      new File([new Uint8Array(5 * 1024 * 1024 + 1)], "large.png", { type: "image/png" }),
    );
    expect(await screen.findByText(/up to 5 MB\.$/)).toBeTruthy();
    expect(server.calls("POST /api/v1/receipts")).toHaveLength(0);
  });

  it("shows an existing attachment when editing and keeps it locked to that transaction", async () => {
    const transaction = transactionFixture({ receipt: { id, imageUrl: receipt.imageUrl } });
    receipt = { ...receipt, status: "confirmed", transactionId: transaction.id };
    renderForm(transaction);
    expect(await screen.findByAltText("Attached receipt")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Remove receipt from form" })).toBeNull();
  });
});

describe("transaction details", () => {
  it("shows the attached receipt with transaction information", async () => {
    const transaction = transactionFixture({ receipt: { id, imageUrl: receipt.imageUrl } });
    server.on(`GET /api/v1/transactions/${transaction.id}`, () => json(200, transaction));
    render(
      <QueryClientProvider client={client}>
        <TransactionDetailsDialog transaction={transaction} onClose={vi.fn()} onEdit={vi.fn()} />
      </QueryClientProvider>,
    );
    expect(await screen.findByRole("dialog", { name: "Transaction details" })).toBeTruthy();
    expect(screen.getByAltText("Attached receipt").getAttribute("src")).toContain(receipt.imageUrl);
    expect(screen.getByText("Fresh Market")).toBeTruthy();
  });
  it("omits the receipt area for a transaction without an attachment", async () => {
    const transaction = transactionFixture();
    server.on(`GET /api/v1/transactions/${transaction.id}`, () => json(200, transaction));
    render(
      <QueryClientProvider client={client}>
        <TransactionDetailsDialog transaction={transaction} onClose={vi.fn()} onEdit={vi.fn()} />
      </QueryClientProvider>,
    );
    expect(await screen.findByRole("dialog", { name: "Transaction details" })).toBeTruthy();
    expect(screen.queryByRole("region", { name: "Transaction receipt" })).toBeNull();
  });
});
