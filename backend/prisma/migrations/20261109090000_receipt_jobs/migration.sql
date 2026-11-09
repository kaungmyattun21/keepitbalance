CREATE TABLE "receipts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "content_hash" VARCHAR(64) NOT NULL,
  "status" VARCHAR(20) NOT NULL DEFAULT 'queued',
  "version" INTEGER NOT NULL DEFAULT 1,
  "job_id" UUID,
  "draft" JSONB,
  "raw_text" TEXT,
  "error" TEXT,
  "transaction_id" UUID,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "receipts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "receipts_status_check" CHECK ("status" IN ('queued', 'processing', 'needs_review', 'failed', 'confirmed')),
  CONSTRAINT "receipts_version_check" CHECK ("version" > 0),
  CONSTRAINT "receipts_confirmation_check" CHECK (("status" = 'confirmed') = ("transaction_id" IS NOT NULL)),
  CONSTRAINT "receipts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "receipts_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE NO ACTION ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "receipts_user_id_content_hash_key" ON "receipts"("user_id", "content_hash");
CREATE UNIQUE INDEX "receipts_transaction_id_key" ON "receipts"("transaction_id");
CREATE INDEX "receipts_user_id_created_at_idx" ON "receipts"("user_id", "created_at");

CREATE TABLE "receipt_images" (
  "receipt_id" UUID NOT NULL,
  "content_type" TEXT NOT NULL,
  "data" BYTEA NOT NULL,
  CONSTRAINT "receipt_images_pkey" PRIMARY KEY ("receipt_id"),
  CONSTRAINT "receipt_images_receipt_id_fkey" FOREIGN KEY ("receipt_id") REFERENCES "receipts"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "receipt_images_size_check" CHECK (octet_length("data") BETWEEN 1 AND 5242880)
);
