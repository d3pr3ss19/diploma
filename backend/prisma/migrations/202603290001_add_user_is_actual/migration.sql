ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "is_actual" BOOLEAN;

UPDATE "users"
SET "is_actual" = COALESCE("is_actual", "is_active", true)
WHERE "is_actual" IS NULL;

ALTER TABLE "users"
ALTER COLUMN "is_actual" SET DEFAULT true,
ALTER COLUMN "is_actual" SET NOT NULL;
