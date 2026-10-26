import { vi } from "vitest";

type Handler = (request: Request) => Response | Promise<Response>;

export function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function toRequest(input: RequestInfo | URL, init?: RequestInit): Request {
  if (input instanceof Request) return input;
  return new Request(new URL(String(input), "http://localhost:3000"), init);
}

export function createFetchMock() {
  const handlers = new Map<string, Handler>();

  const fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = toRequest(input, init);
    const { pathname } = new URL(request.url);
    const handler = handlers.get(`${request.method} ${pathname}`);
    if (!handler) throw new Error(`No fetch mock for ${request.method} ${pathname}`);
    return handler(request);
  });

  return {
    fetch,
    on(route: `${"GET" | "POST" | "PATCH" | "DELETE"} /${string}`, handler: Handler) {
      handlers.set(route, handler);
    },
    calls(route: string) {
      return fetch.mock.calls
        .map(([input, init]) => toRequest(input, init))
        .filter((request) => {
          return `${request.method} ${new URL(request.url).pathname}` === route;
        });
    },
    reset() {
      handlers.clear();
      fetch.mockClear();
    },
  };
}
