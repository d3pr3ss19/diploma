#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
# shellcheck source=./lib/temp-postgres.sh
source "$ROOT_DIR/scripts/lib/temp-postgres.sh"

fail() {
  echo "[verify-prisma-redeploy] ❌ $1" >&2
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

TEMP_PG_LABEL="verify-prisma-redeploy"
TEMP_PG_DB_NAME="${VERIFY_PRISMA_REDEPLOY_DB_NAME:-diploma_verify_redeploy}"
TEMP_PG_DB_USER="${VERIFY_PRISMA_REDEPLOY_DB_USER:-postgres}"
TEMP_PG_DB_PASSWORD="${VERIFY_PRISMA_REDEPLOY_DB_PASSWORD:-postgres}"
TEMP_PG_DB_IMAGE="${VERIFY_PRISMA_REDEPLOY_DB_IMAGE:-postgres:16-alpine}"
TEMP_PG_DB_PORT="${VERIFY_PRISMA_REDEPLOY_DB_PORT:-}"
TEMP_PG_DATABASE_URL="${TEST_DATABASE_URL:-}"

temp_pg_setup

run_backend_step() {
  local title="$1"
  shift
  echo "[verify-prisma-redeploy] ▶ $title"
  (
    cd "$BACKEND_DIR"
    DATABASE_URL="$TEMP_PG_DATABASE_URL" "$@"
  )
  echo "[verify-prisma-redeploy] ✅ $title"
}

assert_scalar_equals() {
  local sql="$1"
  local expected="$2"
  local actual
  actual="$(temp_pg_exec_psql "$sql" | tr -d '[:space:]')"
  [[ "$actual" == "$expected" ]] || fail "Ожидалось '$expected', получено '$actual' для SQL: $sql"
}

run_backend_step "prisma generate" npm run prisma:generate
run_backend_step "prisma migrate deploy (pass 1)" npm run prisma:migrate:deploy
run_backend_step "prisma migrate deploy (pass 2)" npm run prisma:migrate:deploy

if [[ -n "${TEMP_PG_CONTAINER_ID:-}" ]]; then
  assert_scalar_equals "SELECT COUNT(*) FROM \"_prisma_migrations\";" "1"
  echo "[verify-prisma-redeploy] ✅ _prisma_migrations count remains 1"

  assert_scalar_equals "SELECT to_regclass('public.refresh_sessions');" "refresh_sessions"
  echo "[verify-prisma-redeploy] ✅ refresh_sessions still exists after redeploy"
else
  echo "[verify-prisma-redeploy] ⚠️ SQL-проверки пропущены: используется внешняя БД (TEST_DATABASE_URL)"
fi

echo "[verify-prisma-redeploy] 🎉 Повторный prisma migrate deploy smoke-check пройден"
