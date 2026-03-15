#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"

fail() {
  echo "[ci-auth-db] ❌ $1" >&2
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "Требуется команда '$1'"
}

require_cmd npm

# Mandatory env for DB migration/seed execution.
: "${DATABASE_URL:?DATABASE_URL is required for prisma migrate/seed}"

run_backend_step() {
  local title="$1"
  shift
  echo "[ci-auth-db] ▶ $title"
  (
    cd "$BACKEND_DIR"
    "$@"
  )
  echo "[ci-auth-db] ✅ $title"
}

run_backend_step "prisma generate" npm run prisma:generate
run_backend_step "prisma migrate deploy" npm run prisma:migrate:deploy
run_backend_step "seed auth users" npm run seed:auth-users

echo "[ci-auth-db] 🎉 DB prepare for auth checks completed"
