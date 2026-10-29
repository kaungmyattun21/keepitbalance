import { beforeEach, describe, expect, it } from "vitest";
import { newAgent, signUp, testUser, type Agent } from "../../../../test/http.ts";

let agent: Agent;

beforeEach(async () => {
  agent = newAgent();
  await signUp(agent);
});

describe("GET /api/v1/categories", () => {
  it("lists the user's categories grouped by type, then sorted by name", async () => {
    const response = await agent.get("/api/v1/categories");

    expect(response.status).toBe(200);
    expect(
      response.body.data.map(({ type, name }: { type: string; name: string }) => `${type}:${name}`),
    ).toEqual([
      "income:Other",
      "income:Salary",
      "expense:Bills",
      "expense:Eating out",
      "expense:Groceries",
      "expense:Housing",
      "expense:Other",
      "expense:Transport",
    ]);
    expect(response.body.data[0]).toEqual({ id: expect.any(String), name: "Other", type: "income" });
  });

  it("filters by type", async () => {
    const response = await agent.get("/api/v1/categories?type=income");

    expect(response.body.data.map(({ name }: { name: string }) => name)).toEqual(["Other", "Salary"]);
  });

  it("rejects an unknown type", async () => {
    const response = await agent.get("/api/v1/categories?type=savings");

    expect(response.status).toBe(400);
    expect(response.body.error.details[0]).toMatchObject({ location: "query", path: "type" });
  });

  it("never includes another user's categories", async () => {
    await signUp(newAgent(), { ...testUser, email: "other@example.com" });

    const response = await agent.get("/api/v1/categories");

    expect(response.body.data).toHaveLength(8);
  });

  it("requires a session", async () => {
    expect((await newAgent().get("/api/v1/categories")).status).toBe(401);
  });
});
