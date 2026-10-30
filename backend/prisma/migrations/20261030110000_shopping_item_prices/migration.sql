ALTER TABLE "shopping_list_items" ADD COLUMN "price" DECIMAL(12,2);
ALTER TABLE "shopping_list_items" ADD CONSTRAINT "shopping_list_items_price_check" CHECK ("price" IS NULL OR "price" >= 0);
