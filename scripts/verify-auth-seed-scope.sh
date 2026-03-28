#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
# shellcheck source=./lib/temp-postgres.sh
source "$ROOT_DIR/scripts/lib/temp-postgres.sh"

fail() {
  echo "[verify-auth-seed-scope] ❌ $1" >&2
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

TEMP_PG_LABEL="verify-auth-seed-scope"
TEMP_PG_DB_NAME="${VERIFY_AUTH_SEED_SCOPE_DB_NAME:-diploma_verify_seed_scope}"
TEMP_PG_DB_USER="${VERIFY_AUTH_SEED_SCOPE_DB_USER:-postgres}"
TEMP_PG_DB_PASSWORD="${VERIFY_AUTH_SEED_SCOPE_DB_PASSWORD:-postgres}"
TEMP_PG_DB_IMAGE="${VERIFY_AUTH_SEED_SCOPE_DB_IMAGE:-postgres:16-alpine}"
TEMP_PG_DB_PORT="${VERIFY_AUTH_SEED_SCOPE_DB_PORT:-}"
TEMP_PG_DATABASE_URL="${TEST_DATABASE_URL:-}"

temp_pg_setup

run_backend_step() {
  local title="$1"
  shift
  echo "[verify-auth-seed-scope] ▶ $title"
  (
    cd "$BACKEND_DIR"
    DATABASE_URL="$TEMP_PG_DATABASE_URL" "$@"
  )
  echo "[verify-auth-seed-scope] ✅ $title"
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
run_backend_step "seed auth users" npm run seed:auth-users

if [[ -n "${TEMP_PG_CONTAINER_ID:-}" ]]; then
  assert_scalar_equals "SELECT COUNT(*) FROM users;" "3"
  echo "[verify-auth-seed-scope] ✅ users count is exactly 3"

  assert_scalar_equals "SELECT string_agg(email, ',' ORDER BY email) FROM users;" "admin@kp.local,operator@kp.local,subscriber@kp.local"
  echo "[verify-auth-seed-scope] ✅ only expected auth emails were created"

  assert_scalar_equals "SELECT COUNT(*) FROM subscribers;" "0"
  assert_scalar_equals "SELECT COUNT(*) FROM accounts;" "0"
  assert_scalar_equals "SELECT COUNT(*) FROM meters;" "0"
  assert_scalar_equals "SELECT COUNT(*) FROM meter_readings;" "0"
  assert_scalar_equals "SELECT COUNT(*) FROM tariffs;" "0"
  assert_scalar_equals "SELECT COUNT(*) FROM accruals;" "0"
  assert_scalar_equals "SELECT COUNT(*) FROM payments;" "0"
  assert_scalar_equals "SELECT COUNT(*) FROM requests;" "0"
  assert_scalar_equals "SELECT COUNT(*) FROM request_status_history;" "0"
  echo "[verify-auth-seed-scope] ✅ domain tables remain untouched by auth seed"
else
  echo "[verify-auth-seed-scope] ⚠️ SQL-проверки пропущены: используется внешняя БД (TEST_DATABASE_URL)"
fi

echo "[verify-auth-seed-scope] 🎉 Auth seed scope-check пройден"
