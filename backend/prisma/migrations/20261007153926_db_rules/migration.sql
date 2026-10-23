-- Database rules that schema.prisma cannot express.
-- Prisma leaves these alone in later migrations (verified with Prisma 7.10).
-- Constraint names match learning/test-constraints.sql.

-- ---------------------------------------------------------------------------
-- CHECK constraints: every row must satisfy the condition
-- (a CHECK passes when the value is NULL, e.g. an empty note)
-- ---------------------------------------------------------------------------

-- users: goals are positive numbers (FR-11)
ALTER TABLE "users"
  ADD CONSTRAINT "users_daily_calorie_goal_check"  CHECK ("daily_calorie_goal" > 0),
  ADD CONSTRAINT "users_daily_water_goal_ml_check" CHECK ("daily_water_goal_ml" > 0);

-- categories: no empty or space-only names
ALTER TABLE "categories"
  ADD CONSTRAINT "categories_name_check" CHECK (length(trim("name")) > 0);

-- transactions: amount > 0 (FR-2), note max 500 characters
ALTER TABLE "transactions"
  ADD CONSTRAINT "transactions_amount_check" CHECK ("amount" > 0),
  ADD CONSTRAINT "transactions_note_check"   CHECK (length("note") <= 500);

-- ingredients: no empty names or units
ALTER TABLE "ingredients"
  ADD CONSTRAINT "ingredients_name_check" CHECK (length(trim("name")) > 0),
  ADD CONSTRAINT "ingredients_unit_check" CHECK (length(trim("unit")) > 0);

-- recipes
ALTER TABLE "recipes"
  ADD CONSTRAINT "recipes_name_check"                 CHECK (length(trim("name")) > 0),
  ADD CONSTRAINT "recipes_servings_check"             CHECK ("servings" > 0),
  ADD CONSTRAINT "recipes_calories_per_serving_check" CHECK ("calories_per_serving" >= 0);

-- quantities
ALTER TABLE "recipe_ingredients"
  ADD CONSTRAINT "recipe_ingredients_quantity_check"  CHECK ("quantity" > 0);
ALTER TABLE "pantry_items"
  ADD CONSTRAINT "pantry_items_quantity_check"        CHECK ("quantity" >= 0);
ALTER TABLE "shopping_list_items"
  ADD CONSTRAINT "shopping_list_items_quantity_check" CHECK ("quantity" > 0);

-- meal plan: servings > 0
ALTER TABLE "meal_plan_entries"
  ADD CONSTRAINT "meal_plan_entries_servings_check"   CHECK ("servings" > 0);

-- water: amount > 0
ALTER TABLE "water_logs"
  ADD CONSTRAINT "water_logs_amount_ml_check"         CHECK ("amount_ml" > 0);

-- shopping lists: completed_at is set if and only if the list is COMPLETED
ALTER TABLE "shopping_lists"
  ADD CONSTRAINT "shopping_list_completed_at_matches_status"
  CHECK (("status" = 'COMPLETED') = ("completed_at" IS NOT NULL));

-- ---------------------------------------------------------------------------
-- Special indexes
-- ---------------------------------------------------------------------------

-- Only one OPEN shopping list per user (partial unique index)
CREATE UNIQUE INDEX "shopping_lists_one_open_per_user"
  ON "shopping_lists" ("user_id") WHERE "status" = 'OPEN';

-- Ingredient names unique per user, ignoring case ('Flour' = 'flour')
CREATE UNIQUE INDEX "ingredients_user_lower_name_key"
  ON "ingredients" ("user_id", lower("name"));
