import type { ErrorCode, ValidationIssue } from "@keepitbalance/shared/api";
import { env } from "./env.ts";

export type ApiErrorCode = ErrorCode | "NETWORK_ERROR";

export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly details: unknown;

  constructor(status: number, code: ApiErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }

  get validationIssues(): ValidationIssue[] {
    return this.code === "VALIDATION_ERROR" && Array.isArray(this.details)
      ? (this.details as ValidationIssue[])
      : [];
  }
}

type UnauthorizedHandler = (error: ApiError) => void;
let onUnauthorized: UnauthorizedHandler | undefined;

export function setUnauthorizedHandler(handler: UnauthorizedHandler | undefined): void {
  onUnauthorized = handler;
}

type QueryValue = string | number | boolean | null | undefined;

type RequestOptions = {
  query?: Record<string, QueryValue>;
  body?: unknown;
  signal?: AbortSignal;
};

async function request<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
  const url = buildUrl(path, options.query);
  const hasBody = options.body !== undefined;

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      credentials: "include",
      headers: { Accept: "application/json", ...(hasBody && { "Content-Type": "application/json" }) },
      body: hasBody ? JSON.stringify(options.body) : undefined,
      signal: options.signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new ApiError(0, "NETWORK_ERROR", "Can't reach the server. Check your connection and try again.");
  }

  if (response.ok) {
    return (response.status === 204 ? undefined : await response.json()) as T;
  }

  const error = await toApiError(response);
  if (error.status === 401) onUnauthorized?.(error);
  throw error;
}

function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  const url = `${env.apiBaseUrl}${path.startsWith("/") ? path : `/${path}`}`;
  if (!query) return url;

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  }
  const search = params.toString();
  return search ? `${url}?${search}` : url;
}

async function toApiError(response: Response): Promise<ApiError> {
  const body: unknown = await response.json().catch(() => undefined);
  const error = (body as { error?: { code?: unknown; message?: unknown; details?: unknown } } | undefined)
    ?.error;

  if (error && typeof error.code === "string" && typeof error.message === "string") {
    return new ApiError(response.status, error.code as ApiErrorCode, error.message, error.details);
  }
  if (response.status === 502 || response.status === 503 || response.status === 504) {
    return new ApiError(
      response.status,
      "NETWORK_ERROR",
      "The server isn't responding. Try again in a moment.",
    );
  }
  return new ApiError(response.status, "INTERNAL_ERROR", "Something went wrong. Please try again.");
}

export const api = {
  get: <T>(path: string, options?: Omit<RequestOptions, "body">) => request<T>("GET", path, options),
  post: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, "body">) =>
    request<T>("POST", path, { ...options, body }),
  patch: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, "body">) =>
    request<T>("PATCH", path, { ...options, body }),
  delete: <T = void>(path: string, options?: Omit<RequestOptions, "body">) =>
    request<T>("DELETE", path, options),
};
