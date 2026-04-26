-- Add user region
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "region" TEXT;

-- Signup request status enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SignupRequestStatus') THEN
    CREATE TYPE "SignupRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
  END IF;
END $$;

-- Signup requests table
CREATE TABLE IF NOT EXISTS "signup_requests" (
  "id" SERIAL NOT NULL,
  "full_name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "address" TEXT NOT NULL,
  "apartment" TEXT,
  "region" TEXT NOT NULL,
  "status" "SignupRequestStatus" NOT NULL DEFAULT 'PENDING',
  "reviewed_by_user_id" INTEGER,
  "review_comment" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "signup_requests_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "signup_requests_email_key" ON "signup_requests"("email");
CREATE INDEX IF NOT EXISTS "signup_requests_status_idx" ON "signup_requests"("status");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'signup_requests_reviewed_by_user_id_fkey'
  ) THEN
    ALTER TABLE "signup_requests"
      ADD CONSTRAINT "signup_requests_reviewed_by_user_id_fkey"
      FOREIGN KEY ("reviewed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
