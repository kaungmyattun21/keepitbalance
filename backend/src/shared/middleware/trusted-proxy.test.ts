import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { errorHandler } from "./error-handler.ts";
import { CLIENT_IP_HEADER, resolveClientAddress } from "./trusted-proxy.ts";

function proxyApp(trustedProxies: string[] = []) {
  const app = express();
  app.set("trust proxy", trustedProxies);
  app.use(resolveClientAddress);
  app.get("/", (req, res) => {
    res.json({
      ip: req.ip,
      clientIp: req.headers[CLIENT_IP_HEADER],
      protocol: req.headers["x-forwarded-proto"],
      forwardedHost: req.headers["x-forwarded-host"] ?? null,
    });
  });
  app.use(errorHandler);
  return app;
}

describe("trusted proxy handling", () => {
  it("ignores forwarded addresses and protocol from a direct client", async () => {
    const response = await request(proxyApp())
      .get("/")
      .set("X-Forwarded-For", "198.51.100.10")
      .set("X-Forwarded-Proto", "https")
      .set("X-Forwarded-Host", "evil.example")
      .set(CLIENT_IP_HEADER, "198.51.100.20");

    expect(response.status).toBe(200);
    expect(response.body.ip).toMatch(/^(::ffff:)?127\.0\.0\.1$/);
    expect(response.body.clientIp).toBe(response.body.ip);
    expect(response.body.protocol).toBe("http");
    expect(response.body.forwardedHost).toBeNull();
  });

  it("ignores a forwarded chain when the socket peer is outside the allowlist", async () => {
    const response = await request(proxyApp(["192.0.2.0/24"]))
      .get("/")
      .set("X-Forwarded-For", "198.51.100.10, 192.0.2.1")
      .set("X-Forwarded-Proto", "https");

    expect(response.body.clientIp).toMatch(/^(::ffff:)?127\.0\.0\.1$/);
    expect(response.body.protocol).toBe("http");
  });

  it("accepts a trusted proxy's client address and overwrites the internal header", async () => {
    const response = await request(proxyApp(["127.0.0.1/32", "::1/128"]))
      .get("/")
      .set("X-Forwarded-For", "198.51.100.10")
      .set("X-Forwarded-Proto", "https")
      .set(CLIENT_IP_HEADER, "198.51.100.20");

    expect(response.body.clientIp).toBe("198.51.100.10");
    expect(response.body.protocol).toBe("https");
  });

  it("stops at the nearest untrusted hop instead of accepting a spoofed leftmost IP", async () => {
    const response = await request(proxyApp(["127.0.0.1/32", "::1/128", "192.0.2.0/24"]))
      .get("/")
      .set("X-Forwarded-For", "203.0.113.99, 198.51.100.10, 192.0.2.5");

    expect(response.body.clientIp).toBe("198.51.100.10");
  });

  it("supports IPv6 client addresses", async () => {
    const response = await request(proxyApp(["127.0.0.1/32", "::1/128"]))
      .get("/")
      .set("X-Forwarded-For", "2001:db8::1234");

    expect(response.body.clientIp).toBe("2001:db8::1234");
  });

  it("rejects a malformed client address supplied by a trusted proxy", async () => {
    const response = await request(proxyApp(["127.0.0.1/32", "::1/128"]))
      .get("/")
      .set("X-Forwarded-For", "unknown");

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });
});
