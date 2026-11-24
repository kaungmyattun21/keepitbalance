// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Category, Transaction } from "@keepitbalance/shared/finance";
import { createFetchMock, json } from "@/shared/test/fetch-mock";
import { financeKeys } from "../../shared/query-keys.ts";
import { TransactionForm } from "../transactions/components/TransactionForm.tsx";
import type { SpeechRecognitionEventLike, SpeechRecognitionLike } from "./types.ts";

const groupId = "33333333-3333-4333-8333-333333333333";
const incomeGroupId = "44444444-4444-4444-8444-444444444444";
const eatingOut: Category = {
  id: "22222222-2222-4222-8222-222222222222",
  groupId,
  name: "Eating out",
  type: "expense",
  icon: null,
};
const groceries: Category = { ...eatingOut, id: "55555555-5555-4555-8555-555555555555", name: "Groceries" };
const salary: Category = {
  ...eatingOut,
  id: "66666666-6666-4666-8666-666666666666",
  groupId: incomeGroupId,
  name: "Salary",
  type: "income",
};
const categories = [eatingOut, groceries, salary];

class FakeRecognition implements SpeechRecognitionLike {
  static current: FakeRecognition | null = null;
  lang = "";
  interimResults = false;
  continuous = false;
  maxAlternatives = 1;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;
  start = vi.fn(() => {
    FakeRecognition.current = this;
  });
  stop = vi.fn(() => this.onend?.());
  abort = vi.fn();
}

function say(...results: string[]) {
  const recognition = FakeRecognition.current!;
  act(() => {
    recognition.onresult?.({
      resultIndex: 0,
      results: results.map((transcript) => ({ isFinal: true, 0: { transcript } })),
    });
    recognition.onend?.();
  });
}

const server = createFetchMock();
let client: QueryClient;
const onSaved = vi.fn();
const input = (label: string) => screen.getByLabelText(label) as HTMLInputElement;

function renderForm(transaction?: Transaction) {
  return render(
    <QueryClientProvider client={client}>
      <TransactionForm
        categories={categories}
        today="2026-11-24"
        transaction={transaction}
        onSaved={onSaved}
      />
    </QueryClientProvider>,
  );
}

async function speak(...results: string[]) {
  await userEvent.click(screen.getByRole("button", { name: "Speak transaction" }));
  say(...results);
}

async function submittedBody() {
  await userEvent.click(screen.getByRole("button", { name: "Add transaction" }));
  await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
  return server.calls("POST /api/v1/transactions")[0]!.json();
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
    { id: groupId, name: "Lifestyle", type: "expense", categories: [eatingOut, groceries] },
    { id: incomeGroupId, name: "Income", type: "income", categories: [salary] },
  ]);
  vi.stubGlobal("fetch", server.fetch);
  vi.stubGlobal("SpeechRecognition", FakeRecognition);
  server.on("GET /api/v1/transactions/category-suggestion", () => json(200, { data: null }));
  server.on("POST /api/v1/transactions", async (request) => {
    const body = await request.json();
    const category = categories.find((option) => option.id === body.categoryId)!;
    return json(201, { ...body, id: "t1", category, receipt: null, shoppingListId: null });
  });
});
afterEach(() => {
  cleanup();
  client.clear();
  server.reset();
  onSaved.mockClear();
  FakeRecognition.current = null;
  vi.unstubAllGlobals();
});

describe("voice entry in the transaction form", () => {
  it("fills the form from speech and suggests the category last used for the note", async () => {
    server.on("GET /api/v1/transactions/category-suggestion", (request) => {
      expect(new URL(request.url).searchParams.get("note")).toBe("Coffee");
      return json(200, { data: { categoryId: eatingOut.id, type: "expense" } });
    });
    renderForm();

    await speak("coffee 85 yesterday");

    expect(FakeRecognition.current!.lang).toBe("en-US");
    expect(screen.getByRole("status").textContent).toBe("Heard: “coffee 85 yesterday”");
    expect(input("Amount").value).toBe("85");
    expect(input("Date").value).toBe("2026-11-23");
    expect(input("Note").value).toBe("Coffee");
    await waitFor(() => expect(screen.getByLabelText("Category").textContent).toContain("Eating out"));
    expect(await submittedBody()).toMatchObject({
      type: "expense",
      amount: "85.00",
      date: "2026-11-23",
      note: "Coffee",
      categoryId: eatingOut.id,
    });
  });

  it("switches to income and picks a category named in the sentence", async () => {
    renderForm();

    await speak("salary 30,000");

    expect(await submittedBody()).toMatchObject({
      type: "income",
      amount: "30000.00",
      categoryId: salary.id,
    });
    expect(server.calls("GET /api/v1/transactions/category-suggestion")).toHaveLength(0);
  });

  it("never overwrites fields the user typed, but can correct an earlier spoken attempt", async () => {
    renderForm();
    await userEvent.type(input("Amount"), "12");

    await speak("lunch 90");
    expect(input("Amount").value).toBe("12");
    expect(input("Note").value).toBe("Lunch");

    await speak("dinner 150 today");
    expect(input("Amount").value).toBe("12");
    expect(input("Note").value).toBe("Dinner");
  });

  it("merges results that repeat earlier words, as Chrome on Android does", async () => {
    renderForm();

    await speak("coffee", "coffee 85", "yesterday");

    expect(screen.getByRole("status").textContent).toBe("Heard: “coffee 85 yesterday”");
    expect(input("Amount").value).toBe("85");
    expect(input("Date").value).toBe("2026-11-23");
    expect(input("Note").value).toBe("Coffee");
  });

  it("shows a clear message when the microphone is blocked", async () => {
    renderForm();
    await userEvent.click(screen.getByRole("button", { name: "Speak transaction" }));

    act(() => {
      FakeRecognition.current!.onerror?.({ error: "not-allowed" });
      FakeRecognition.current!.onend?.();
    });

    expect(screen.getByRole("alert").textContent).toContain("Microphone access is blocked");
    expect(input("Amount").value).toBe("");
  });

  it("is hidden when the browser has no speech recognition, and when editing", () => {
    vi.stubGlobal("SpeechRecognition", undefined);
    renderForm();
    expect(screen.queryByRole("button", { name: "Speak transaction" })).toBeNull();
    cleanup();

    vi.stubGlobal("SpeechRecognition", FakeRecognition);
    renderForm({
      id: "t1",
      type: "expense",
      amount: "5.00",
      date: "2026-11-20",
      note: null,
      category: eatingOut,
      shoppingListId: null,
      receipt: null,
      createdAt: "2026-11-20T00:00:00.000Z",
      updatedAt: "2026-11-20T00:00:00.000Z",
    });
    expect(screen.queryByRole("button", { name: "Speak transaction" })).toBeNull();
  });
});
