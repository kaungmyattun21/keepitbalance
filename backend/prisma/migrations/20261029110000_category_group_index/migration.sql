-- Support group category lookups and foreign-key deletion checks.
CREATE INDEX "categories_group_id_idx" ON "categories"("group_id");
