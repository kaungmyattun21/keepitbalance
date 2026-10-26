import { queryOptions } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "./api.ts";
import { ensureQuery, queryClient } from "./query-client.ts";

afterEach(() => {
  queryClient.clear();
});

const testQuery = (queryFn: () => Promise<string>) => queryOptions({ queryKey: ["test", "value"], queryFn });

describe("ensureQuery", () => {
  it("fetches and caches on a miss", async () => {
    const queryFn = vi.fn().mockResolvedValue("fresh");

    await expect(ensureQuery(testQuery(queryFn))).resolves.toBe("fresh");
    expect(queryClient.getQueryData(["test", "value"])).toBe("fresh");
    expect(queryFn).toHaveBeenCalledOnce();
  });

  it("returns cached data without fetching, even when it is stale", async () => {
    queryClient.setQueryData(["test", "value"], "cached", { updatedAt: Date.now() - 60 * 60_000 });
    const queryFn = vi.fn().mockResolvedValue("fresh");

    await expect(ensureQuery(testQuery(queryFn))).resolves.toBe("cached");
    expect(queryFn).not.toHaveBeenCalled();
  });

  it("does not retry client errors", async () => {
    const queryFn = vi.fn().mockRejectedValue(new ApiError(404, "NOT_FOUND", "Not found"));

    await expect(ensureQuery(testQuery(queryFn))).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(queryFn).toHaveBeenCalledOnce();
  });
});
