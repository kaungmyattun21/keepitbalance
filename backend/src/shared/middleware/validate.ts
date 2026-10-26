import type { ValidationIssue } from "@keepitbalance/shared/api";
import type { RequestHandler } from "express";
import { z } from "zod";
import { badRequest } from "../errors.ts";

type Schemas = {
  body?: z.ZodType;
  query?: z.ZodType;
  params?: z.ZodType;
};

export const validate =
  (schemas: Schemas): RequestHandler =>
  (req, _res, next) => {
    const details: ValidationIssue[] = [];

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

      // Express 5 makes req.query a getter, so it can't be assigned.
      Object.defineProperty(req, location, { value: result.data, writable: true, configurable: true });
    }

    if (details.length > 0) {
      return next(badRequest("VALIDATION_ERROR", "Invalid request", details));
    }
    next();
  };
