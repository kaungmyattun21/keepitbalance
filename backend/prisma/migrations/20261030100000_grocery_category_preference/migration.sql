ALTER TABLE "users" ADD COLUMN "grocery_category_id" UUID;
ALTER TABLE "users" ADD CONSTRAINT "users_grocery_category_id_fkey" FOREIGN KEY ("grocery_category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
