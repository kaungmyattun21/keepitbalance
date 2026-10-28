import { describe, expect, it } from "vitest";
import { prisma } from "../../shared/db.ts";
import { CLIENT_IP_HEADER } from "../../shared/middleware/trusted-proxy.ts";
import { newAgent, sessionCookie, signUp, testUser, WEB_ORIGIN } from "../../test/http.ts";
import { lastLinkSentTo, outbox } from "../../test/outbox.ts";

describe("sign-up", () => {
  it("still accepts form-encoded authentication bodies", async () => {
    const response = await newAgent().post("/api/v1/auth/sign-up/email").type("form").send(testUser);

    expect(response.status).toBe(200);
    expect(await prisma.user.findFirstOrThrow()).toMatchObject({ email: testUser.email });
  });

  it("records the socket address instead of client-supplied IP headers", async () => {
    const agent = newAgent().set("X-Forwarded-For", "198.51.100.10").set(CLIENT_IP_HEADER, "198.51.100.20");
    await signUp(agent);

    const session = await prisma.session.findFirstOrThrow();
    expect(session.ipAddress).toBe("127.0.0.1");
  });

  it("creates the user, an argon2id password hash, a session and default categories", async () => {
    const agent = newAgent();
    const response = await signUp(agent);

    expect(sessionCookie(response)).toMatch(/HttpOnly/);
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: testUser.email },
      include: { accounts: true, sessions: true, categories: true },
    });
    expect(user).toMatchObject({ name: "Kaung", timezone: "Asia/Yangon", emailVerified: false });
    expect(user.accounts).toEqual([
      expect.objectContaining({ providerId: "credential", accountId: user.id }),
    ]);
    expect(user.accounts[0]?.password).toMatch(/^\$argon2id\$/);
    expect(user.sessions).toHaveLength(1);
    expect(user.categories.map((category) => `${category.type}:${category.name}`).sort()).toEqual([
      "EXPENSE:Bills",
      "EXPENSE:Eating out",
      "EXPENSE:Groceries",
      "EXPENSE:Housing",
      "EXPENSE:Other",
      "EXPENSE:Transport",
      "INCOME:Other",
      "INCOME:Salary",
    ]);
  });

  it("stores emails in lowercase and defaults the timezone to UTC", async () => {
    await signUp(newAgent(), { email: "Kaung@Example.COM", timezone: undefined });

    const user = await prisma.user.findFirstOrThrow();
    expect(user).toMatchObject({ email: "kaung@example.com", timezone: "UTC" });
  });

  it("sends a verification email that links back to the web app", async () => {
    await signUp(newAgent());

    const link = lastLinkSentTo(testUser.email);
    expect(link.pathname).toBe("/api/v1/auth/verify-email");
    expect(link.searchParams.get("callbackURL")).toBe(`${WEB_ORIGIN}/verified`);
  });

  it.each([
    ["a too-short password", { password: "1234567" }, 400, "PASSWORD_TOO_SHORT"],
    ["an unknown timezone", { timezone: "Mars/Base" }, 400, undefined],
  ])("rejects %s", async (_case, overrides, status, code) => {
    const response = await newAgent()
      .post("/api/v1/auth/sign-up/email")
      .send({ ...testUser, ...overrides });

    expect(response.status).toBe(status);
    if (code) expect(response.body.code).toBe(code);
    expect(await prisma.user.count()).toBe(0);
  });

  it("rejects a duplicate email", async () => {
    await signUp(newAgent());

    const response = await newAgent().post("/api/v1/auth/sign-up/email").send(testUser);

    expect(response.status).toBe(422);
    expect(response.body.code).toBe("USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL");
  });

  it("rejects requests from untrusted origins", async () => {
    const response = await newAgent()
      .set("Origin", "https://evil.example")
      .post("/api/v1/auth/sign-up/email")
      .send(testUser);

    expect(response.status).toBe(403);
    expect(await prisma.user.count()).toBe(0);
  });
});

describe("sessions", () => {
  it("protects /me and returns the profile for the session's user", async () => {
    const agent = newAgent();
    expect((await agent.get("/api/v1/me")).status).toBe(401);

    await signUp(agent);
    const response = await agent.get("/api/v1/me");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: expect.any(String),
      name: "Kaung",
      email: "kaung@example.com",
      emailVerified: false,
      image: null,
      dailyCalorieGoal: 2000,
      dailyWaterGoalMl: 2000,
      timezone: "Asia/Yangon",
      createdAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
    });
  });

  it("logs in with the right password only", async () => {
    await signUp(newAgent());

    const wrong = await newAgent()
      .post("/api/v1/auth/sign-in/email")
      .send({ email: testUser.email, password: "wrong-password" });
    expect(wrong.status).toBe(401);
    expect(wrong.body.code).toBe("INVALID_EMAIL_OR_PASSWORD");

    const agent = newAgent();
    const right = await agent
      .post("/api/v1/auth/sign-in/email")
      .send({ email: testUser.email, password: testUser.password });
    expect(right.status).toBe(200);
    expect((await agent.get("/api/v1/me")).status).toBe(200);
  });

  it("ends the session on sign-out", async () => {
    const agent = newAgent();
    await signUp(agent);

    expect((await agent.post("/api/v1/auth/sign-out")).status).toBe(200);

    expect((await agent.get("/api/v1/me")).status).toBe(401);
    expect(await prisma.session.count()).toBe(0);
  });

  it("extends an active session and sends the renewed cookie through requireAuth", async () => {
    const agent = newAgent();
    await signUp(agent);
    const fiveDaysLeft = new Date(Date.now() + 5 * 24 * 60 * 60_000);
    await prisma.session.updateMany({ data: { expiresAt: fiveDaysLeft } });

    const response = await agent.get("/api/v1/me");

    expect(response.status).toBe(200);
    expect(sessionCookie(response)).toMatch(/Max-Age=604800/);
    const session = await prisma.session.findFirstOrThrow();
    expect(session.expiresAt.getTime()).toBeGreaterThan(fiveDaysLeft.getTime());
  });

  it("treats an expired session as logged out", async () => {
    const agent = newAgent();
    await signUp(agent);
    await prisma.session.updateMany({ data: { expiresAt: new Date(Date.now() - 60_000) } });

    expect((await agent.get("/api/v1/me")).status).toBe(401);
  });
});

describe("email verification", () => {
  it("marks the email verified and redirects to the web app", async () => {
    const agent = newAgent();
    await signUp(agent);
    const link = lastLinkSentTo(testUser.email);

    const response = await agent.get(link.pathname + link.search);

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe(`${WEB_ORIGIN}/verified`);
    expect(await prisma.user.findFirstOrThrow()).toMatchObject({ emailVerified: true });
  });

  it("redirects an invalid link to the web app with an error", async () => {
    const response = await newAgent().get(
      `/api/v1/auth/verify-email?token=bogus&callbackURL=${encodeURIComponent(`${WEB_ORIGIN}/verified`)}`,
    );

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe(`${WEB_ORIGIN}/verified?error=INVALID_TOKEN`);
  });
});

describe("password reset", () => {
  async function requestReset(email: string) {
    return newAgent()
      .post("/api/v1/auth/request-password-reset")
      .send({ email, redirectTo: `${WEB_ORIGIN}/reset-password` });
  }

  it("answers the same way for unknown emails, without sending anything", async () => {
    await signUp(newAgent());
    outbox.length = 0;

    const known = await requestReset(testUser.email);
    const unknown = await requestReset("nobody@example.com");

    expect(known.body).toEqual(unknown.body);
    expect(outbox.map((email) => email.to)).toEqual([testUser.email]);
  });

  it("sets the new password once, signs out every device, and keeps the old password from working", async () => {
    const laptop = newAgent();
    await signUp(laptop);
    await requestReset(testUser.email);
    const resetLink = lastLinkSentTo(testUser.email);

    const landing = await newAgent().get(resetLink.pathname + resetLink.search);
    expect(landing.status).toBe(302);
    const token = new URL(landing.headers.location as string).searchParams.get("token");
    expect(token).toBeTruthy();

    const reset = await newAgent()
      .post("/api/v1/auth/reset-password")
      .send({ token, newPassword: "new-horse-battery-2" });
    expect(reset.status).toBe(200);

    const reused = await newAgent()
      .post("/api/v1/auth/reset-password")
      .send({ token, newPassword: "another-pass-3" });
    expect(reused.body.code).toBe("INVALID_TOKEN");

    expect((await laptop.get("/api/v1/me")).status).toBe(401);
    const oldPassword = await newAgent()
      .post("/api/v1/auth/sign-in/email")
      .send({ email: testUser.email, password: testUser.password });
    expect(oldPassword.status).toBe(401);
    const newPassword = await newAgent()
      .post("/api/v1/auth/sign-in/email")
      .send({ email: testUser.email, password: "new-horse-battery-2" });
    expect(newPassword.status).toBe(200);
  });
});
