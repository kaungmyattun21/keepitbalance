import { describe, expect, it } from "vitest";
import { prisma } from "../../../../shared/db.ts";
import { createDefaultCategories } from "./service.ts";

describe("createDefaultCategories", () => {
  it("creates each default once, even when run twice", async () => {
    const user = await prisma.user.create({ data: { name: "Kaung", email: "kaung@example.com" } });

    await createDefaultCategories(user.id);
    await createDefaultCategories(user.id);

    expect(await prisma.category.count({ where: { userId: user.id } })).toBe(8);
    expect(await prisma.categoryGroup.count({ where: { userId: user.id } })).toBe(3);
    const categories = await prisma.category.findMany({
      where: { userId: user.id },
      include: { group: true },
    });
    expect(
      categories.every(
        (category) => category.group.userId === user.id && category.group.type === category.type,
      ),
    ).toBe(true);
  });
});
