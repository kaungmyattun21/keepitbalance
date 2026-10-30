-- Category groups (D-028): every category belongs to one group of the same user and type.

-- CreateTable
CREATE TABLE "category_groups" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "type" "transaction_type" NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "category_groups_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "category_groups_user_id_type_name_key" ON "category_groups"("user_id", "type", "name");
CREATE UNIQUE INDEX "category_groups_id_user_id_type_key" ON "category_groups"("id", "user_id", "type");

ALTER TABLE "category_groups" ADD CONSTRAINT "category_groups_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Same rule as categories: no empty or space-only names.
ALTER TABLE "category_groups" ADD CONSTRAINT "category_groups_name_check" CHECK (length(trim("name")) > 0);

-- Add the column as nullable, file every existing category into a default group, then require it.
ALTER TABLE "categories" ADD COLUMN "group_id" UUID;

INSERT INTO "category_groups" ("user_id", "type", "name")
SELECT "users"."id", "defaults"."type"::"transaction_type", "defaults"."name"
FROM "users"
CROSS JOIN (VALUES ('EXPENSE', 'Essentials'), ('EXPENSE', 'Lifestyle'), ('INCOME', 'Income')) AS "defaults"("type", "name");

UPDATE "categories"
SET "group_id" = "category_groups"."id"
FROM "category_groups"
WHERE "category_groups"."user_id" = "categories"."user_id"
  AND "category_groups"."type" = "categories"."type"
  AND "category_groups"."name" = CASE
    WHEN "categories"."type" = 'INCOME' THEN 'Income'
    WHEN "categories"."name" IN ('Housing', 'Bills', 'Groceries', 'Transport') THEN 'Essentials'
    ELSE 'Lifestyle'
  END;

ALTER TABLE "categories" ALTER COLUMN "group_id" SET NOT NULL;

ALTER TABLE "categories" ADD CONSTRAINT "categories_group_fkey" FOREIGN KEY ("group_id", "user_id", "type") REFERENCES "category_groups"("id", "user_id", "type") ON DELETE RESTRICT ON UPDATE CASCADE;
