import type { ErrorCode } from "@keepitbalance/shared/api";

export type { ErrorCode };

export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const badRequest = (code: ErrorCode, message: string, details?: unknown) =>
  new AppError(400, code, message, details);

export const unauthorized = (message = "Not logged in") => new AppError(401, "UNAUTHORIZED", message);

export const notFound = (message = "Not found") => new AppError(404, "NOT_FOUND", message);

export const conflict = (code: ErrorCode, message: string) => new AppError(409, code, message);
