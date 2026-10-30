CREATE TYPE "bill_frequency" AS ENUM ('WEEKLY', 'MONTHLY', 'YEARLY');

CREATE TABLE "bills" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "category_id" UUID NOT NULL,
  "type" "transaction_type" NOT NULL DEFAULT 'EXPENSE',
  "name" TEXT NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "frequency" "bill_frequency" NOT NULL,
  "recurrence_anchor" DATE NOT NULL,
  "next_due_date" DATE NOT NULL,
  "last_paid_date" DATE,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "bills_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "bills_name_check" CHECK (length(trim("name")) > 0 AND length("name") <= 100),
  CONSTRAINT "bills_amount_check" CHECK ("amount" > 0),
  CONSTRAINT "bills_type_check" CHECK ("type" = 'EXPENSE'),
  CONSTRAINT "bills_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "bills_category_fkey" FOREIGN KEY ("category_id", "user_id", "type") REFERENCES "categories"("id", "user_id", "type") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "bills_user_id_next_due_date_idx" ON "bills"("user_id", "next_due_date");
CREATE INDEX "bills_category_id_user_id_type_idx" ON "bills"("category_id", "user_id", "type");
