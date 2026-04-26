DO $$ BEGIN
  CREATE TYPE "RequestPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "requests"
  ADD COLUMN IF NOT EXISTS "priority" "RequestPriority" NOT NULL DEFAULT 'NORMAL',
  ADD COLUMN IF NOT EXISTS "contact_phone" TEXT,
  ADD COLUMN IF NOT EXISTS "preferred_visit_at" TIMESTAMP(3);
