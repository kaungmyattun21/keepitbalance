import type { ErrorRequestHandler, RequestHandler } from "express";
import { Prisma } from "../../generated/prisma/client.ts";
import { AppError, notFound } from "../errors.ts";

export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(notFound("Route not found"));
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const appError = toAppError(err);

  if (appError.status >= 500) {
    console.error(err);
  }

  res.status(appError.status).json({
    error: {
      code: appError.code,
      message: appError.message,
      ...(appError.details !== undefined && { details: appError.details }),
    },
  });
};

function toAppError(err: unknown): AppError {
  if (err instanceof AppError) return err;

  if (err instanceof Error && "type" in err) {
    if (err.type === "entity.too.large") {
      return new AppError(413, "PAYLOAD_TOO_LARGE", "Request body must not exceed 100 KiB");
    }
    if (err.type === "encoding.unsupported" || err.type === "charset.unsupported") {
      return new AppError(415, "UNSUPPORTED_MEDIA_TYPE", "Unsupported request encoding");
    }
  }

  if (err instanceof SyntaxError && "type" in err && err.type === "entity.parse.failed") {
    return new AppError(400, "VALIDATION_ERROR", "Request body is not valid JSON");
  }

  // Fallback only: services should throw a specific code for these cases.
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") return new AppError(409, "CONFLICT", "Record already exists");
    if (err.code === "P2025") return notFound();
  }

  return new AppError(500, "INTERNAL_ERROR", "Something went wrong");
}
