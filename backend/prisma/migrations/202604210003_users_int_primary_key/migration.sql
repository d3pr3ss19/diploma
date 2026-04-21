ALTER TABLE "refresh_sessions" DROP CONSTRAINT IF EXISTS "refresh_sessions_user_id_fkey";
ALTER TABLE "subscribers" DROP CONSTRAINT IF EXISTS "subscribers_user_id_fkey";
ALTER TABLE "admin_audit_logs" DROP CONSTRAINT IF EXISTS "admin_audit_logs_actor_user_id_fkey";
ALTER TABLE "admin_audit_logs" DROP CONSTRAINT IF EXISTS "admin_audit_logs_target_user_id_fkey";
ALTER TABLE "meter_readings" DROP CONSTRAINT IF EXISTS "meter_readings_submitted_by_user_id_fkey";
ALTER TABLE "requests" DROP CONSTRAINT IF EXISTS "requests_created_by_user_id_fkey";
ALTER TABLE "requests" DROP CONSTRAINT IF EXISTS "requests_assigned_to_user_id_fkey";
ALTER TABLE "request_status_history" DROP CONSTRAINT IF EXISTS "request_status_history_changed_by_user_id_fkey";

ALTER TABLE "refresh_sessions" ADD COLUMN "user_id_int" INTEGER;
UPDATE "refresh_sessions" rs SET "user_id_int" = u."legacy_id" FROM "users" u WHERE rs."user_id" = u."id";
ALTER TABLE "refresh_sessions" DROP COLUMN "user_id";
ALTER TABLE "refresh_sessions" RENAME COLUMN "user_id_int" TO "user_id";
ALTER TABLE "refresh_sessions" ALTER COLUMN "user_id" SET NOT NULL;

ALTER TABLE "subscribers" ADD COLUMN "user_id_int" INTEGER;
UPDATE "subscribers" s SET "user_id_int" = u."legacy_id" FROM "users" u WHERE s."user_id" = u."id";
ALTER TABLE "subscribers" DROP COLUMN "user_id";
ALTER TABLE "subscribers" RENAME COLUMN "user_id_int" TO "user_id";

ALTER TABLE "admin_audit_logs" ADD COLUMN "actor_user_id_int" INTEGER;
UPDATE "admin_audit_logs" a SET "actor_user_id_int" = u."legacy_id" FROM "users" u WHERE a."actor_user_id" = u."id";
ALTER TABLE "admin_audit_logs" DROP COLUMN "actor_user_id";
ALTER TABLE "admin_audit_logs" RENAME COLUMN "actor_user_id_int" TO "actor_user_id";

ALTER TABLE "admin_audit_logs" ADD COLUMN "target_user_id_int" INTEGER;
UPDATE "admin_audit_logs" a SET "target_user_id_int" = u."legacy_id" FROM "users" u WHERE a."target_user_id" = u."id";
ALTER TABLE "admin_audit_logs" DROP COLUMN "target_user_id";
ALTER TABLE "admin_audit_logs" RENAME COLUMN "target_user_id_int" TO "target_user_id";
ALTER TABLE "admin_audit_logs" ALTER COLUMN "target_user_id" SET NOT NULL;

ALTER TABLE "meter_readings" ADD COLUMN "submitted_by_user_id_int" INTEGER;
UPDATE "meter_readings" mr SET "submitted_by_user_id_int" = u."legacy_id" FROM "users" u WHERE mr."submitted_by_user_id" = u."id";
ALTER TABLE "meter_readings" DROP COLUMN "submitted_by_user_id";
ALTER TABLE "meter_readings" RENAME COLUMN "submitted_by_user_id_int" TO "submitted_by_user_id";
ALTER TABLE "meter_readings" ALTER COLUMN "submitted_by_user_id" SET NOT NULL;

ALTER TABLE "requests" ADD COLUMN "created_by_user_id_int" INTEGER;
UPDATE "requests" r SET "created_by_user_id_int" = u."legacy_id" FROM "users" u WHERE r."created_by_user_id" = u."id";
ALTER TABLE "requests" DROP COLUMN "created_by_user_id";
ALTER TABLE "requests" RENAME COLUMN "created_by_user_id_int" TO "created_by_user_id";
ALTER TABLE "requests" ALTER COLUMN "created_by_user_id" SET NOT NULL;

ALTER TABLE "requests" ADD COLUMN "assigned_to_user_id_int" INTEGER;
UPDATE "requests" r SET "assigned_to_user_id_int" = u."legacy_id" FROM "users" u WHERE r."assigned_to_user_id" = u."id";
ALTER TABLE "requests" DROP COLUMN "assigned_to_user_id";
ALTER TABLE "requests" RENAME COLUMN "assigned_to_user_id_int" TO "assigned_to_user_id";

ALTER TABLE "request_status_history" ADD COLUMN "changed_by_user_id_int" INTEGER;
UPDATE "request_status_history" rsh SET "changed_by_user_id_int" = u."legacy_id" FROM "users" u WHERE rsh."changed_by_user_id" = u."id";
ALTER TABLE "request_status_history" DROP COLUMN "changed_by_user_id";
ALTER TABLE "request_status_history" RENAME COLUMN "changed_by_user_id_int" TO "changed_by_user_id";
ALTER TABLE "request_status_history" ALTER COLUMN "changed_by_user_id" SET NOT NULL;

ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_pkey";
ALTER TABLE "users" DROP COLUMN "id";
ALTER TABLE "users" RENAME COLUMN "legacy_id" TO "id";
ALTER TABLE "users" ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");
DROP INDEX IF EXISTS "users_legacy_id_key";

ALTER TABLE "refresh_sessions" ADD CONSTRAINT "refresh_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "subscribers" ADD CONSTRAINT "subscribers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "meter_readings" ADD CONSTRAINT "meter_readings_submitted_by_user_id_fkey" FOREIGN KEY ("submitted_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "requests" ADD CONSTRAINT "requests_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "requests" ADD CONSTRAINT "requests_assigned_to_user_id_fkey" FOREIGN KEY ("assigned_to_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "request_status_history" ADD CONSTRAINT "request_status_history_changed_by_user_id_fkey" FOREIGN KEY ("changed_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "refresh_sessions_user_id_idx" ON "refresh_sessions"("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "subscribers_user_id_key" ON "subscribers"("user_id");
CREATE INDEX IF NOT EXISTS "admin_audit_logs_target_user_id_idx" ON "admin_audit_logs"("target_user_id");
CREATE INDEX IF NOT EXISTS "admin_audit_logs_actor_user_id_idx" ON "admin_audit_logs"("actor_user_id");
