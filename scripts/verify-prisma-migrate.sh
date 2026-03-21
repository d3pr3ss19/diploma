#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
# shellcheck source=./lib/temp-postgres.sh
source "$ROOT_DIR/scripts/lib/temp-postgres.sh"

fail() {
  echo "[verify-prisma-migrate] ❌ $1" >&2
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

TEMP_PG_LABEL="verify-prisma-migrate"
TEMP_PG_DB_NAME="${VERIFY_PRISMA_DB_NAME:-diploma_verify}"
TEMP_PG_DB_USER="${VERIFY_PRISMA_DB_USER:-postgres}"
TEMP_PG_DB_PASSWORD="${VERIFY_PRISMA_DB_PASSWORD:-postgres}"
TEMP_PG_DB_IMAGE="${VERIFY_PRISMA_DB_IMAGE:-postgres:16-alpine}"
TEMP_PG_DB_PORT="${VERIFY_PRISMA_DB_PORT:-}"
TEMP_PG_DATABASE_URL="${TEST_DATABASE_URL:-}"

temp_pg_setup

run_backend_step() {
  local title="$1"
  shift
  echo "[verify-prisma-migrate] ▶ $title"
  (
    cd "$BACKEND_DIR"
    DATABASE_URL="$TEMP_PG_DATABASE_URL" "$@"
  )
  echo "[verify-prisma-migrate] ✅ $title"
}

run_backend_step "prisma generate" npm run prisma:generate
run_backend_step "prisma migrate deploy" npm run prisma:migrate:deploy

if [[ -n "${TEMP_PG_CONTAINER_ID:-}" ]]; then
  temp_pg_exec_psql "SELECT to_regclass('public.refresh_sessions');" | grep -qx 'refresh_sessions' \
    || fail "После prisma migrate deploy таблица refresh_sessions не найдена"
  echo "[verify-prisma-migrate] ✅ refresh_sessions exists after migrate deploy"
else
  echo "[verify-prisma-migrate] ⚠️ Проверка наличия refresh_sessions пропущена: используется внешняя БД (TEST_DATABASE_URL)"
fi

echo "[verify-prisma-migrate] 🎉 Prisma migrate deploy smoke-check пройден"
