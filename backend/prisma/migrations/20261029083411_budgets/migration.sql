-- CreateTable
CREATE TABLE "budgets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "type" "transaction_type" NOT NULL DEFAULT 'EXPENSE',
    "amount" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "budgets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "budgets_user_id_category_id_key" ON "budgets"("user_id", "category_id");

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_category_fkey" FOREIGN KEY ("category_id", "user_id", "type") REFERENCES "categories"("id", "user_id", "type") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Database rules schema.prisma cannot express (see the db_rules migration).
-- type is part of the category FK; fixing it to EXPENSE means only expense categories can have a budget.
ALTER TABLE "budgets"
  ADD CONSTRAINT "budgets_type_check"   CHECK ("type" = 'EXPENSE'),
  ADD CONSTRAINT "budgets_amount_check" CHECK ("amount" > 0);
