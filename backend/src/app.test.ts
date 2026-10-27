import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "./app.ts";

describe("app", () => {
  it("reports health, including the database", async () => {
    const response = await request(app).get("/api/v1/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });

  it("answers unknown routes with the API error shape", async () => {
    const response = await request(app).get("/api/v1/does-not-exist");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: { code: "NOT_FOUND", message: "Route not found" } });
  });

  it("rejects malformed JSON as a validation error, not a crash", async () => {
    const response = await request(app)
      .get("/api/v1/health")
      .set("Content-Type", "application/json")
      .send("{not json");

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("tells the frontend which sign-in methods are enabled", async () => {
    const response = await request(app).get("/api/v1/auth-config");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ google: false });
  });

  it("allows the web app's origin with credentials (CORS)", async () => {
    const response = await request(app).get("/api/v1/health").set("Origin", "http://localhost:5173");

    expect(response.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
    expect(response.headers["access-control-allow-credentials"]).toBe("true");
  });
});
