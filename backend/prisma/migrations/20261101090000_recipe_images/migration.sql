CREATE TABLE "recipe_images" (
    "recipe_id" UUID NOT NULL,
    "content_type" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    CONSTRAINT "recipe_images_pkey" PRIMARY KEY ("recipe_id"),
    CONSTRAINT "recipe_images_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "recipe_images_size_check" CHECK (octet_length("data") BETWEEN 1 AND 2097152),
    CONSTRAINT "recipe_images_type_check" CHECK ("content_type" IN ('image/jpeg', 'image/png', 'image/webp'))
);
