ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "legacy_id" SERIAL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_legacy_id_key'
  ) THEN
    ALTER TABLE "users" ADD CONSTRAINT "users_legacy_id_key" UNIQUE ("legacy_id");
  END IF;
END $$;
