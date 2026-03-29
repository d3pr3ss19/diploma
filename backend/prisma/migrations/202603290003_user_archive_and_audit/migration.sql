ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "admin_audit_logs" (
  "id" TEXT NOT NULL,
  "actor_user_id" TEXT,
  "target_user_id" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "details" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "admin_audit_logs_target_user_id_idx" ON "admin_audit_logs"("target_user_id");
CREATE INDEX IF NOT EXISTS "admin_audit_logs_actor_user_id_idx" ON "admin_audit_logs"("actor_user_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'admin_audit_logs_actor_user_id_fkey'
  ) THEN
    ALTER TABLE "admin_audit_logs"
      ADD CONSTRAINT "admin_audit_logs_actor_user_id_fkey"
      FOREIGN KEY ("actor_user_id") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'admin_audit_logs_target_user_id_fkey'
  ) THEN
    ALTER TABLE "admin_audit_logs"
      ADD CONSTRAINT "admin_audit_logs_target_user_id_fkey"
      FOREIGN KEY ("target_user_id") REFERENCES "users"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
