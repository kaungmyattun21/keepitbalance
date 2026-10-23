import type { ErrorRequestHandler, RequestHandler } from "express";
import { Prisma } from "../../generated/prisma/client.ts";
import { AppError, notFound } from "../errors.ts";

// Mounted after all routes: any request that reaches it matched no route.
export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(notFound("Route not found"));
};

// Mounted last. Express 5 forwards rejected promises from async handlers here too.
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

  // Malformed JSON body, raised by express.json().
  if (err instanceof SyntaxError && "type" in err && err.type === "entity.parse.failed") {
    return new AppError(400, "VALIDATION_ERROR", "Request body is not valid JSON");
  }

  // Safety net: services should check these cases themselves and throw a specific code.
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") return new AppError(409, "CONFLICT", "Record already exists");
    if (err.code === "P2025") return notFound();
  }

  return new AppError(500, "INTERNAL_ERROR", "Something went wrong");
}
