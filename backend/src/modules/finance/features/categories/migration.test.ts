import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { prisma } from "../../../../shared/db.ts";

it("backfills every existing category without changing budgets or transactions", async () => {
  const migration = readFileSync(
    new URL("../../../../../prisma/migrations/20261029100000_category_groups/migration.sql", import.meta.url),
    "utf8",
  );
  // An isolated schema models the database before this migration, including custom categories.
  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("CREATE SCHEMA category_group_migration_test");
    await tx.$executeRawUnsafe("SET LOCAL search_path TO category_group_migration_test");
    await tx.$executeRawUnsafe("CREATE TYPE transaction_type AS ENUM ('INCOME', 'EXPENSE')");
    await tx.$executeRawUnsafe("CREATE TABLE users (id UUID PRIMARY KEY)");
    await tx.$executeRawUnsafe(
      "CREATE TABLE categories (id UUID PRIMARY KEY, user_id UUID NOT NULL REFERENCES users(id), type transaction_type NOT NULL, name TEXT NOT NULL)",
    );
    await tx.$executeRawUnsafe(
      "CREATE TABLE budgets (category_id UUID REFERENCES categories(id), amount NUMERIC(12,2))",
    );
    await tx.$executeRawUnsafe(
      "CREATE TABLE transactions (category_id UUID REFERENCES categories(id), amount NUMERIC(12,2))",
    );
    await tx.$executeRawUnsafe(
      "INSERT INTO users VALUES ('11111111-1111-4111-8111-111111111111'), ('22222222-2222-4222-8222-222222222222')",
    );
    await tx.$executeRawUnsafe(`INSERT INTO categories VALUES
      ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', 'EXPENSE', 'Groceries'),
      ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '11111111-1111-4111-8111-111111111111', 'EXPENSE', 'Hobbies'),
      ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', '11111111-1111-4111-8111-111111111111', 'INCOME', 'Freelance')`);
    await tx.$executeRawUnsafe("INSERT INTO budgets VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 100.20)");
    await tx.$executeRawUnsafe(
      "INSERT INTO transactions VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 20.10)",
    );
    // This migration contains plain DDL/DML statements with no procedural blocks.
    for (const statement of migration.split(";").filter((statement) => statement.trim())) {
      await tx.$executeRawUnsafe(statement);
    }
    const categories = await tx.$queryRaw<
      { name: string; group_name: string; same_owner: boolean; same_type: boolean }[]
    >`
      SELECT c.name, g.name AS group_name, c.user_id = g.user_id AS same_owner, c.type = g.type AS same_type
      FROM categories c JOIN category_groups g ON g.id = c.group_id ORDER BY c.name`;
    expect(categories).toEqual([
      { name: "Freelance", group_name: "Income", same_owner: true, same_type: true },
      { name: "Groceries", group_name: "Essentials", same_owner: true, same_type: true },
      { name: "Hobbies", group_name: "Lifestyle", same_owner: true, same_type: true },
    ]);
    expect(await tx.$queryRaw`SELECT amount::text FROM budgets`).toEqual([{ amount: "100.20" }]);
    expect(await tx.$queryRaw`SELECT amount::text FROM transactions`).toEqual([{ amount: "20.10" }]);
    expect(await tx.$queryRaw`SELECT count(*)::int AS count FROM category_groups`).toEqual([{ count: 6 }]);
    await tx.$executeRawUnsafe("DROP SCHEMA category_group_migration_test CASCADE");
  });
});
