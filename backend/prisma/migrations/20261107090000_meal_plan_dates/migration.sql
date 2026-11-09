ALTER TABLE "users"
ADD COLUMN "meal_plan_start_date" DATE,
ADD COLUMN "meal_plan_end_date" DATE,
ADD CONSTRAINT "users_meal_plan_dates_check" CHECK (
    ("meal_plan_start_date" IS NULL AND "meal_plan_end_date" IS NULL)
    OR (
        "meal_plan_start_date" IS NOT NULL AND "meal_plan_end_date" IS NOT NULL
        AND "meal_plan_start_date" >= DATE '0001-01-01'
        AND "meal_plan_end_date" < DATE '9999-12-31'
        AND "meal_plan_end_date" >= "meal_plan_start_date"
        AND "meal_plan_end_date" - "meal_plan_start_date" <= 30
    )
);
