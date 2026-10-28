import { once } from "node:events";
import { gzipSync } from "node:zlib";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "./app.ts";
import { auth } from "./modules/auth/index.ts";
import { prisma } from "./shared/db.ts";
import { CLIENT_IP_HEADER } from "./shared/middleware/trusted-proxy.ts";
import { newAgent, signUp } from "./test/http.ts";

describe("app", () => {
  it("rate-limits spoofed IP headers while giving distinct resolved clients separate buckets", async () => {
    const context = await auth.$context;
    const previousRateLimit = { ...context.rateLimit };
    const previousTrust = app.get("trust proxy") as unknown;
    Object.assign(context.rateLimit, { enabled: true, window: 60, max: 1 });
    app.set("trust proxy", false);
    try {
      expect((await request(app).get("/api/v1/auth/get-session")).status).toBe(200);
      const spoofed = await request(app)
        .get("/api/v1/auth/get-session")
        .set("X-Forwarded-For", "198.51.100.77")
        .set(CLIENT_IP_HEADER, "198.51.100.88");
      expect(spoofed.status).toBe(429);

      app.set("trust proxy", ["127.0.0.1/32", "::1/128"]);
      const otherClient = await request(app)
        .get("/api/v1/auth/get-session")
        .set("X-Forwarded-For", "198.51.100.99");
      expect(otherClient.status).toBe(200);
    } finally {
      Object.assign(context.rateLimit, previousRateLimit);
      app.set("trust proxy", previousTrust);
    }
  });

  it("passes the resolved trusted-proxy client address to Better Auth", async () => {
    const previousTrust = app.get("trust proxy") as unknown;
    app.set("trust proxy", ["127.0.0.1/32", "::1/128", "192.0.2.0/24"]);
    try {
      await signUp(
        newAgent()
          .set("X-Forwarded-For", "203.0.113.99, 198.51.100.10, 192.0.2.5")
          .set(CLIENT_IP_HEADER, "198.51.100.20"),
      );

      const session = await prisma.session.findFirstOrThrow();
      expect(session.ipAddress).toBe("198.51.100.10");
    } finally {
      app.set("trust proxy", previousTrust);
    }
  });

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

describe("request body limits", () => {
  const limit = 100 * 1024;
  const oversizedBody = JSON.stringify({ padding: "x".repeat(limit) });

  it.each(["/api/v1/auth/sign-up/email", "/api/v1/does-not-exist"])(
    "rejects oversized JSON at %s before processing the request",
    async (path) => {
      const response = await request(app)
        .post(path)
        .set("Content-Type", "application/json")
        .send(oversizedBody);

      expect(response.status).toBe(413);
      expect(response.body.error.code).toBe("PAYLOAD_TOO_LARGE");
      expect(await prisma.user.count()).toBe(0);
    },
  );

  it.each(["/api/v1/auth/sign-up/email", "/api/v1/does-not-exist"])(
    "counts streamed bytes without Content-Length at %s",
    async (path) => {
      // Streaming starts before Supertest's end() hook; listen first so the port is known.
      const server = app.listen(0, "127.0.0.1");
      await once(server, "listening");
      try {
        const pending = request(server)
          .post(path)
          .set("Content-Type", "application/json")
          .set("Transfer-Encoding", "chunked");
        pending.write(oversizedBody.slice(0, 60_000));
        pending.write(oversizedBody.slice(60_000));
        const response = await pending;

        expect(response.status).toBe(413);
        expect(response.body.error.code).toBe("PAYLOAD_TOO_LARGE");
        expect(await prisma.user.count()).toBe(0);
      } finally {
        await new Promise<void>((resolve, reject) => {
          server.close((err) => (err ? reject(err) : resolve()));
        });
      }
    },
  );

  it("accepts a JSON body exactly at the byte limit", async () => {
    const body = JSON.stringify({ padding: "x".repeat(limit - JSON.stringify({ padding: "" }).length) });
    expect(Buffer.byteLength(body)).toBe(limit);

    const response = await request(app)
      .post("/api/v1/does-not-exist")
      .set("Content-Type", "application/json")
      .send(body);

    expect(response.status).toBe(404);
  });

  it("limits auth form bodies as well as JSON", async () => {
    const response = await request(app)
      .post("/api/v1/auth/sign-up/email")
      .type("form")
      .send(`name=${"x".repeat(limit)}`);

    expect(response.status).toBe(413);
    expect(response.body.error.code).toBe("PAYLOAD_TOO_LARGE");
  });

  it.each(["/api/v1/auth/sign-up/email", "/api/v1/does-not-exist"])(
    "rejects compressed request bodies at %s and keeps serving requests",
    async (path) => {
      const response = await request(app)
        .post(path)
        .set("Content-Type", "application/json")
        .set("Content-Encoding", "gzip")
        .send(gzipSync("{}"));

      expect(response.status).toBe(415);
      expect(response.body.error.code).toBe("UNSUPPORTED_MEDIA_TYPE");
      expect((await request(app).get("/api/v1/health")).status).toBe(200);
    },
  );
});
