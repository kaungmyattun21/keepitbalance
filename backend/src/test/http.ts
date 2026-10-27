import request from "supertest";
import { app } from "../app.ts";

export const WEB_ORIGIN = "http://localhost:5173";

export type Agent = ReturnType<typeof request.agent>;

export function newAgent(): Agent {
  return request.agent(app).set("Origin", WEB_ORIGIN);
}

export const testUser = {
  name: "Kaung",
  email: "kaung@example.com",
  password: "correct-horse-1",
  timezone: "Asia/Yangon",
};

export async function signUp(agent: Agent, overrides: Partial<typeof testUser> = {}) {
  const response = await agent
    .post("/api/v1/auth/sign-up/email")
    .send({ ...testUser, callbackURL: `${WEB_ORIGIN}/verified`, ...overrides });
  if (response.status !== 200) throw new Error(`Sign-up failed: ${response.status} ${response.text}`);
  return response;
}

export function sessionCookie(response: { headers: Record<string, unknown> }): string | undefined {
  const cookies = response.headers["set-cookie"];
  const list = Array.isArray(cookies) ? (cookies as string[]) : [];
  return list.find((cookie) => cookie.startsWith("keepitbalance.session_token="));
}
