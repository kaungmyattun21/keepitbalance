import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { errorHandler } from "./error-handler.ts";
import { validate } from "./validate.ts";

const testApp = express()
  .use(express.json())
  .get(
    "/items/:id",
    validate({
      params: z.object({ id: z.uuid() }),
      query: z.object({ page: z.coerce.number().int().min(1).default(1) }),
    }),
    (req, res) => {
      res.json({ params: req.params, query: req.query });
    },
  )
  .post("/items", validate({ body: z.object({ name: z.string().min(1) }) }), (req, res) => {
    res.status(201).json(req.body);
  })
  .use(errorHandler);

const id = "9a2e3b8c-1d4f-4e6a-8b7c-0d1e2f3a4b5c";

describe("validate", () => {
  it("replaces params and query with parsed, coerced values", async () => {
    const response = await request(testApp).get(`/items/${id}?page=3`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ params: { id }, query: { page: 3 } });
  });

  it("applies defaults", async () => {
    const response = await request(testApp).get(`/items/${id}`);

    expect(response.body.query).toEqual({ page: 1 });
  });

  it("reports every invalid field with its location", async () => {
    const response = await request(testApp).get("/items/not-a-uuid?page=0");

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(response.body.error.details).toEqual([
      expect.objectContaining({ location: "params", path: "id" }),
      expect.objectContaining({ location: "query", path: "page" }),
    ]);
  });

  it("validates the body", async () => {
    const response = await request(testApp).post("/items").send({ name: "" });

    expect(response.status).toBe(400);
    expect(response.body.error.details).toEqual([
      expect.objectContaining({ location: "body", path: "name" }),
    ]);
  });
});
