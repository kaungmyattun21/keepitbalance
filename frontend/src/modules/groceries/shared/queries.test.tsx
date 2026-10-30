// @vitest-environment jsdom
import { Profiler } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { CurrentShoppingList } from "@keepitbalance/shared/groceries";
import { groceryKeys, useCurrentListView } from "./queries.ts";

afterEach(cleanup);

it("does not re-render the visible list when only the confirmed checkout version changes", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
  const snapshot: CurrentShoppingList = {
    defaultCategoryId: null,
    data: {
      id: "list-1",
      weekStart: "2026-10-26",
      status: "open",
      completedAt: null,
      transaction: null,
      items: [],
      updatedAt: "2026-10-30T00:00:00.000Z",
    },
  };
  client.setQueryData(groceryKeys.current, snapshot);
  function VisibleList() {
    const { data } = useCurrentListView();
    return <p>{data?.id}</p>;
  }
  const committed = vi.fn();
  render(
    <QueryClientProvider client={client}>
      <Profiler id="list" onRender={committed}>
        <VisibleList />
      </Profiler>
    </QueryClientProvider>,
  );
  expect(screen.getByText("list-1")).toBeTruthy();
  const before = committed.mock.calls.length;
  await act(async () => {
    client.setQueryData<CurrentShoppingList>(groceryKeys.current, {
      ...snapshot,
      data: { ...snapshot.data!, updatedAt: "2026-10-30T00:00:01.000Z" },
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  expect(client.getQueryData<CurrentShoppingList>(groceryKeys.current)?.data?.updatedAt).toBe(
    "2026-10-30T00:00:01.000Z",
  );
  expect(committed).toHaveBeenCalledTimes(before);
  client.clear();
});
