import { beforeEach, describe, expect, it } from "vitest";
import { RECIPE_IMAGE_MAX_BYTES } from "@keepitbalance/shared/meal-planning";
import { prisma } from "../../shared/db.ts";
import { newAgent, signUp, type Agent } from "../../test/http.ts";

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aDnsAAAAASUVORK5CYII=",
  "base64",
);
let agent: Agent;
let input: {
  name: string;
  servings: number;
  steps: string;
  caloriesPerServing: number;
  ingredients: { ingredientId: string; quantity: string }[];
};
beforeEach(async () => {
  agent = newAgent();
  await signUp(agent);
  const ingredient = await agent.post("/api/v1/ingredients").send({ name: "Rice", unit: "g" });
  input = {
    name: "Rice bowl",
    servings: 2,
    steps: "Cook.",
    caloriesPerServing: 300,
    ingredients: [{ ingredientId: ingredient.body.id, quantity: "300" }],
  };
});
const photo = (data = png) => ({ contentType: "image/png", data: data.toString("base64") });

describe("recipe images", () => {
  it("saves a photo atomically, keeps it on ordinary edits, replaces it, and removes it", async () => {
    // Exceeds the normal 100 KiB request limit, while remaining a valid PNG.
    const bytes = Buffer.concat([png, Buffer.alloc(130 * 1024)]);
    const created = await agent.post("/api/v1/recipes").send({ ...input, image: photo(bytes) });
    expect(created.status).toBe(201);
    const id = created.body.id;
    const planned = await agent
      .post("/api/v1/meal-plans")
      .send({ recipeId: id, date: "2026-10-26", slot: "dinner", servings: 2 });
    expect(planned.status).toBe(201);
    expect(planned.body.recipe.imageUrl).toBe(created.body.imageUrl);
    const first = await agent.get(`/api/v1${created.body.imageUrl}`);
    expect(first.status).toBe(200);
    expect(first.headers["content-type"]).toContain("image/png");
    expect(first.headers["cache-control"]).toBe("private, no-store");
    expect(first.headers["x-content-type-options"]).toBe("nosniff");
    expect(first.body).toEqual(bytes);
    expect(created.body.image).toBeUndefined();
    const edited = await agent
      .put(`/api/v1/recipes/${id}`)
      .send({ ...input, name: "Edited", updatedAt: created.body.updatedAt });
    expect(edited.status).toBe(200);
    expect((await agent.get(`/api/v1${edited.body.imageUrl}`)).body).toEqual(bytes);
    const replaced = await agent
      .put(`/api/v1/recipes/${id}`)
      .send({ ...input, image: photo(), updatedAt: edited.body.updatedAt });
    expect(replaced.status).toBe(200);
    expect(replaced.body.imageUrl).not.toBe(edited.body.imageUrl);
    const week = await agent.get("/api/v1/meal-plans?weekStart=2026-10-26");
    expect(week.body.data[0].recipe.imageUrl).toBe(replaced.body.imageUrl);
    expect((await agent.get(`/api/v1${replaced.body.imageUrl}`)).body).toEqual(png);
    const stale = await agent
      .put(`/api/v1/recipes/${id}`)
      .send({ ...input, image: null, updatedAt: edited.body.updatedAt });
    expect(stale.status).toBe(409);
    expect((await agent.get(`/api/v1${replaced.body.imageUrl}`)).status).toBe(200);
    const removed = await agent
      .put(`/api/v1/recipes/${id}`)
      .send({ ...input, image: null, updatedAt: replaced.body.updatedAt });
    expect(removed.status).toBe(200);
    expect(removed.body.imageUrl).toBeNull();
    expect(
      (await agent.get("/api/v1/meal-plans?weekStart=2026-10-26")).body.data[0].recipe.imageUrl,
    ).toBeNull();
    expect((await agent.get(`/api/v1/recipes/${id}/image`)).status).toBe(404);
    expect(await prisma.recipeImage.count()).toBe(0);
  });
  it("protects image access and deletes the photo with its recipe", async () => {
    const created = await agent.post("/api/v1/recipes").send({ ...input, image: photo() });
    const path = `/api/v1${created.body.imageUrl}`;
    expect((await newAgent().get(path)).status).toBe(401);
    const other = newAgent();
    await signUp(other, { email: "other@example.com" });
    expect((await other.get(path)).status).toBe(404);
    expect(
      (
        await other
          .put(`/api/v1/recipes/${created.body.id}`)
          .send({ ...input, image: null, updatedAt: created.body.updatedAt })
      ).status,
    ).toBe(404);
    expect((await agent.get(path)).status).toBe(200);
    expect((await agent.delete(`/api/v1/recipes/${created.body.id}`)).status).toBe(204);
    expect(await prisma.recipeImage.count()).toBe(0);
  });
  it("rejects unsupported, mismatched, malformed and oversized images without creating recipes", async () => {
    for (const image of [
      { ...photo(), contentType: "image/svg+xml" },
      { ...photo(), contentType: "image/jpeg" },
      { ...photo(), data: "not-base64" },
      photo(Buffer.from("This is not an image")),
      photo(Buffer.concat([png, Buffer.alloc(RECIPE_IMAGE_MAX_BYTES + 1 - png.length)])),
    ]) {
      expect((await agent.post("/api/v1/recipes").send({ ...input, image })).status).toBe(400);
    }
    expect(await prisma.recipe.count()).toBe(0);
    expect(await prisma.recipeImage.count()).toBe(0);
  });
});
