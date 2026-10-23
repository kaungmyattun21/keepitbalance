import type { RequestHandler } from "express";
import { z } from "zod";
import { badRequest } from "../errors.ts";

type Schemas = {
  body?: z.ZodType;
  query?: z.ZodType;
  params?: z.ZodType;
};

// Validates and replaces req.body / req.query / req.params with the parsed (coerced, defaulted) values.
// Usage: router.post("/", validate({ body: createTransactionSchema }), controller.create)
export const validate =
  (schemas: Schemas): RequestHandler =>
  (req, _res, next) => {
    const details: { location: string; path: string; message: string }[] = [];

    for (const location of ["params", "query", "body"] as const) {
      const schema = schemas[location];
      if (!schema) continue;

      const result = schema.safeParse(req[location]);
      if (!result.success) {
        for (const issue of result.error.issues) {
          details.push({ location, path: issue.path.join("."), message: issue.message });
        }
        continue;
      }

      // Express 5 makes req.query a getter, so define an own property instead of assigning.
      Object.defineProperty(req, location, { value: result.data, writable: true, configurable: true });
    }

    if (details.length > 0) {
      return next(badRequest("VALIDATION_ERROR", "Invalid request", details));
    }
    next();
  };
