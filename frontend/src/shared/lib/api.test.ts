import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, ApiError, setUnauthorizedHandler } from "./api.ts";

const fetchMock = vi.fn<typeof fetch>();

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
  setUnauthorizedHandler(undefined);
});

describe("api requests", () => {
  it("prefixes the base URL, sends the cookie, and returns JSON", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { status: "ok" }));

    await expect(api.get("/health")).resolves.toEqual({ status: "ok" });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/api/v1/health");
    expect(init?.credentials).toBe("include");
    expect(init?.method).toBe("GET");
  });

  it("builds the query string and skips empty values", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { data: [] }));

    await api.get("/transactions", { query: { month: "2026-09", type: undefined, page: 2, note: "" } });

    expect(fetchMock.mock.calls[0]![0]).toBe("/api/v1/transactions?month=2026-09&page=2");
  });

  it("sends a JSON body on writes", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(201, { id: "1" }));

    await api.post("/categories", { type: "expense", name: "Rent" });

    const init = fetchMock.mock.calls[0]![1]!;
    expect(init.method).toBe("POST");
    expect(init.body).toBe('{"type":"expense","name":"Rent"}');
    expect(new Headers(init.headers).get("Content-Type")).toBe("application/json");
  });

  it("returns undefined for 204 No Content", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

    await expect(api.delete("/categories/1")).resolves.toBeUndefined();
  });
});

describe("api errors", () => {
  it("turns our error shape into an ApiError with validation issues", async () => {
    const details = [{ location: "body", path: "amount", message: "Too small" }];
    fetchMock.mockResolvedValueOnce(
      jsonResponse(400, { error: { code: "VALIDATION_ERROR", message: "Invalid request", details } }),
    );

    const error = await api.post("/transactions", {}).catch((err: unknown) => err);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 400, code: "VALIDATION_ERROR", message: "Invalid request" });
    expect((error as ApiError).validationIssues).toEqual(details);
  });

  it("calls the unauthorized handler on 401, then still throws", async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    fetchMock.mockResolvedValueOnce(
      jsonResponse(401, { error: { code: "UNAUTHORIZED", message: "Not logged in or session expired" } }),
    );

    await expect(api.get("/me")).rejects.toMatchObject({ status: 401, code: "UNAUTHORIZED" });
    expect(handler).toHaveBeenCalledOnce();
  });

  it("does not call the unauthorized handler for other errors", async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    fetchMock.mockResolvedValueOnce(
      jsonResponse(404, { error: { code: "NOT_FOUND", message: "Not found" } }),
    );

    await expect(api.get("/transactions/x")).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(handler).not.toHaveBeenCalled();
  });

  it("reports a non-JSON 502 from the dev proxy as a network error", async () => {
    fetchMock.mockResolvedValueOnce(new Response("<html>Bad Gateway</html>", { status: 502 }));

    await expect(api.get("/health")).rejects.toMatchObject({ status: 502, code: "NETWORK_ERROR" });
  });

  it("reports a failed fetch (offline) as a network error with status 0", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));

    await expect(api.get("/health")).rejects.toMatchObject({ status: 0, code: "NETWORK_ERROR" });
  });

  it("lets aborted requests through unchanged, so TanStack Query can cancel them", async () => {
    fetchMock.mockRejectedValueOnce(new DOMException("The operation was aborted.", "AbortError"));

    await expect(api.get("/health")).rejects.toMatchObject({ name: "AbortError" });
  });
});
