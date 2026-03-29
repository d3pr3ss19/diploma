#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
# shellcheck source=./lib/temp-postgres.sh
source "$ROOT_DIR/scripts/lib/temp-postgres.sh"

fail() {
  echo "[verify-auth-seed] ❌ $1" >&2
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "Требуется команда '$1'"
}

cleanup() {
  temp_pg_cleanup
}

trap cleanup EXIT

require_cmd bash
require_cmd npm
require_cmd python3

TEMP_PG_LABEL="verify-auth-seed"
TEMP_PG_DB_NAME="${VERIFY_AUTH_SEED_DB_NAME:-diploma_verify_seed}"
TEMP_PG_DB_USER="${VERIFY_AUTH_SEED_DB_USER:-postgres}"
TEMP_PG_DB_PASSWORD="${VERIFY_AUTH_SEED_DB_PASSWORD:-postgres}"
TEMP_PG_DB_IMAGE="${VERIFY_AUTH_SEED_DB_IMAGE:-postgres:16-alpine}"
TEMP_PG_DB_PORT="${VERIFY_AUTH_SEED_DB_PORT:-}"
TEMP_PG_DATABASE_URL="${TEST_DATABASE_URL:-}"

temp_pg_setup

run_backend_step() {
  local title="$1"
  shift
  echo "[verify-auth-seed] ▶ $title"
  (
    cd "$BACKEND_DIR"
    DATABASE_URL="$TEMP_PG_DATABASE_URL" "$@"
  )
  echo "[verify-auth-seed] ✅ $title"
}

assert_scalar_equals() {
  local sql="$1"
  local expected="$2"
  local actual
  actual="$(temp_pg_exec_psql "$sql" | tr -d '[:space:]')"
  [[ "$actual" == "$expected" ]] || fail "Ожидалось '$expected', получено '$actual' для SQL: $sql"
}

run_backend_step "prisma generate" npm run prisma:generate
run_backend_step "prisma migrate deploy" npm run prisma:migrate:deploy
run_backend_step "seed auth users (pass 1)" npm run seed:auth-users
run_backend_step "seed auth users (pass 2)" npm run seed:auth-users

if [[ -n "${TEMP_PG_CONTAINER_ID:-}" ]]; then
  assert_scalar_equals "SELECT COUNT(*) FROM roles;" "3"
  echo "[verify-auth-seed] ✅ roles count is 3"

  assert_scalar_equals "SELECT COUNT(*) FROM users;" "3"
  echo "[verify-auth-seed] ✅ users count is 3"

  assert_scalar_equals "SELECT COUNT(*) FROM users WHERE email IN ('admin@kp.local', 'operator@kp.local', 'subscriber@kp.local');" "3"
  echo "[verify-auth-seed] ✅ seeded auth emails exist"

  assert_scalar_equals "SELECT COUNT(*) FROM roles WHERE code IN ('ADMIN', 'OPERATOR', 'SUBSCRIBER');" "3"
  echo "[verify-auth-seed] ✅ expected role codes exist"
else
  echo "[verify-auth-seed] ⚠️ SQL-проверки пропущены: используется внешняя БД (TEST_DATABASE_URL)"
fi

echo "[verify-auth-seed] 🎉 Auth seed smoke-check пройден"
