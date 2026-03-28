#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
SCRIPT_DIR="$ROOT_DIR/scripts"
# shellcheck source=./lib/temp-postgres.sh
source "$ROOT_DIR/scripts/lib/temp-postgres.sh"
# shellcheck source=./lib/backend-runtime.sh
source "$ROOT_DIR/scripts/lib/backend-runtime.sh"

fail() {
  echo "[verify-auth-seed-after-runtime] ❌ $1" >&2
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "Требуется команда '$1'"
}

cleanup() {
  backend_runtime_stop
  temp_pg_cleanup

  if [[ -n "${TMP_DIR:-}" && -d "$TMP_DIR" ]]; then
    rm -rf "$TMP_DIR"
  fi
}

trap cleanup EXIT

require_cmd bash
require_cmd curl
require_cmd npm
require_cmd python3

TEMP_PG_LABEL="verify-auth-seed-after-runtime"
TEMP_PG_DB_NAME="${VERIFY_AUTH_SEED_AFTER_RUNTIME_DB_NAME:-diploma_verify_seed_after_runtime}"
TEMP_PG_DB_USER="${VERIFY_AUTH_SEED_AFTER_RUNTIME_DB_USER:-postgres}"
TEMP_PG_DB_PASSWORD="${VERIFY_AUTH_SEED_AFTER_RUNTIME_DB_PASSWORD:-postgres}"
TEMP_PG_DB_IMAGE="${VERIFY_AUTH_SEED_AFTER_RUNTIME_DB_IMAGE:-postgres:16-alpine}"
TEMP_PG_DB_PORT="${VERIFY_AUTH_SEED_AFTER_RUNTIME_DB_PORT:-}"
TEMP_PG_DATABASE_URL="${TEST_DATABASE_URL:-}"
BACKEND_PORT="${VERIFY_AUTH_SEED_AFTER_RUNTIME_PORT:-3300}"
BASE_URL="${BASE_URL:-http://127.0.0.1:${BACKEND_PORT}/api/v1}"
AUTH_JWT_SECRET="${AUTH_JWT_SECRET:-verify-auth-seed-after-runtime-secret}"
WAIT_TIMEOUT="${WAIT_TIMEOUT:-60}"
WAIT_INTERVAL="${WAIT_INTERVAL:-1}"

TMP_DIR="$(mktemp -d)"
BACKEND_LOG="$TMP_DIR/backend.log"

temp_pg_setup

run_backend_step() {
  local title="$1"
  shift
  echo "[verify-auth-seed-after-runtime] ▶ $title"
  (
    cd "$BACKEND_DIR"
    DATABASE_URL="$TEMP_PG_DATABASE_URL" "$@"
  )
  echo "[verify-auth-seed-after-runtime] ✅ $title"
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
run_backend_step "seed auth users (initial)" npm run seed:auth-users

BACKEND_RUNTIME_LABEL="verify-auth-seed-after-runtime"
BACKEND_RUNTIME_DIR="$BACKEND_DIR"
BACKEND_RUNTIME_DATABASE_URL="$TEMP_PG_DATABASE_URL"
BACKEND_RUNTIME_PORT="$BACKEND_PORT"
BACKEND_RUNTIME_AUTH_JWT_SECRET="$AUTH_JWT_SECRET"
BACKEND_RUNTIME_LOG_FILE="$BACKEND_LOG"
BACKEND_RUNTIME_WAIT_SCRIPT="$SCRIPT_DIR/wait-for-http.sh"
BACKEND_RUNTIME_WAIT_TIMEOUT="$WAIT_TIMEOUT"
BACKEND_RUNTIME_WAIT_INTERVAL="$WAIT_INTERVAL"
BACKEND_RUNTIME_BASE_URL="$BASE_URL"
backend_runtime_start

BASE_URL="$BASE_URL" \
E2E_OPERATOR_EMAIL="${E2E_OPERATOR_EMAIL:-operator@kp.local}" \
E2E_OPERATOR_PASSWORD="${E2E_OPERATOR_PASSWORD:-password123}" \
E2E_SUBSCRIBER_EMAIL="${E2E_SUBSCRIBER_EMAIL:-subscriber@kp.local}" \
E2E_SUBSCRIBER_PASSWORD="${E2E_SUBSCRIBER_PASSWORD:-password123}" \
WAIT_TIMEOUT="$WAIT_TIMEOUT" \
WAIT_INTERVAL="$WAIT_INTERVAL" \
"$SCRIPT_DIR/e2e-api-auth-integration.sh"
echo "[verify-auth-seed-after-runtime] ✅ auth integration completed before repeat seed"
backend_runtime_ensure_alive
backend_runtime_stop
unset BACKEND_RUNTIME_PID

run_backend_step "seed auth users (after runtime)" npm run seed:auth-users

if [[ -n "${TEMP_PG_CONTAINER_ID:-}" ]]; then
  assert_scalar_equals "SELECT COUNT(*) FROM users;" "3"
  echo "[verify-auth-seed-after-runtime] ✅ users count remains 3 after repeat seed"

  assert_scalar_equals "SELECT string_agg(email, ',' ORDER BY email) FROM users;" "admin@kp.local,operator@kp.local,subscriber@kp.local"
  echo "[verify-auth-seed-after-runtime] ✅ expected auth emails preserved after repeat seed"

  assert_scalar_equals "SELECT COUNT(*) FROM subscribers;" "0"
  assert_scalar_equals "SELECT COUNT(*) FROM accounts;" "0"
  assert_scalar_equals "SELECT COUNT(*) FROM requests;" "0"
  assert_scalar_equals "SELECT COUNT(*) FROM request_status_history;" "0"
  echo "[verify-auth-seed-after-runtime] ✅ domain tables still untouched after runtime + repeat seed"
else
  echo "[verify-auth-seed-after-runtime] ⚠️ SQL-проверки пропущены: используется внешняя БД (TEST_DATABASE_URL)"
fi

echo "[verify-auth-seed-after-runtime] 🎉 Repeat auth-seed after runtime smoke-check пройден"
