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
  echo "[verify-auth-runtime-domain] ❌ $1" >&2
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

TEMP_PG_LABEL="verify-auth-runtime-domain"
TEMP_PG_DB_NAME="${VERIFY_AUTH_RUNTIME_DOMAIN_DB_NAME:-diploma_verify_runtime_domain}"
TEMP_PG_DB_USER="${VERIFY_AUTH_RUNTIME_DOMAIN_DB_USER:-postgres}"
TEMP_PG_DB_PASSWORD="${VERIFY_AUTH_RUNTIME_DOMAIN_DB_PASSWORD:-postgres}"
TEMP_PG_DB_IMAGE="${VERIFY_AUTH_RUNTIME_DOMAIN_DB_IMAGE:-postgres:16-alpine}"
TEMP_PG_DB_PORT="${VERIFY_AUTH_RUNTIME_DOMAIN_DB_PORT:-}"
TEMP_PG_DATABASE_URL="${TEST_DATABASE_URL:-}"
BACKEND_PORT="${VERIFY_AUTH_RUNTIME_DOMAIN_PORT:-3400}"
BASE_URL="${BASE_URL:-http://127.0.0.1:${BACKEND_PORT}/api/v1}"
AUTH_JWT_SECRET="${AUTH_JWT_SECRET:-verify-auth-runtime-domain-secret}"
WAIT_TIMEOUT="${WAIT_TIMEOUT:-60}"
WAIT_INTERVAL="${WAIT_INTERVAL:-1}"
LOGIN_EMAIL="${VERIFY_AUTH_RUNTIME_DOMAIN_EMAIL:-operator@kp.local}"
LOGIN_PASSWORD="${VERIFY_AUTH_RUNTIME_DOMAIN_PASSWORD:-password123}"

TMP_DIR="$(mktemp -d)"
BACKEND_LOG="$TMP_DIR/backend.log"
RELOGIN_RESPONSE="$TMP_DIR/relogin.json"

temp_pg_setup

run_backend_step() {
  local title="$1"
  shift
  echo "[verify-auth-runtime-domain] ▶ $title"
  (
    cd "$BACKEND_DIR"
    DATABASE_URL="$TEMP_PG_DATABASE_URL" "$@"
  )
  echo "[verify-auth-runtime-domain] ✅ $title"
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

BACKEND_RUNTIME_LABEL="verify-auth-runtime-domain"
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
echo "[verify-auth-runtime-domain] ✅ auth integration completed"
backend_runtime_ensure_alive

RELOGIN_CODE="$(curl -sS -o "$RELOGIN_RESPONSE" -w "%{http_code}" \
  -X POST "$BASE_URL/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$LOGIN_EMAIL\",\"password\":\"$LOGIN_PASSWORD\"}")"
[[ "$RELOGIN_CODE" == "200" || "$RELOGIN_CODE" == "201" ]] || fail "повторный login после logout/refresh цикла вернул HTTP $RELOGIN_CODE"
grep -q '"accessToken"' "$RELOGIN_RESPONSE" || fail "повторный login не вернул accessToken"
echo "[verify-auth-runtime-domain] ✅ repeat login works after refresh/logout cycle"

if [[ -n "${TEMP_PG_CONTAINER_ID:-}" ]]; then
  assert_scalar_equals "SELECT COUNT(*) FROM subscribers;" "0"
  assert_scalar_equals "SELECT COUNT(*) FROM accounts;" "0"
  assert_scalar_equals "SELECT COUNT(*) FROM meters;" "0"
  assert_scalar_equals "SELECT COUNT(*) FROM meter_readings;" "0"
  assert_scalar_equals "SELECT COUNT(*) FROM tariffs;" "0"
  assert_scalar_equals "SELECT COUNT(*) FROM accruals;" "0"
  assert_scalar_equals "SELECT COUNT(*) FROM payments;" "0"
  assert_scalar_equals "SELECT COUNT(*) FROM requests;" "0"
  assert_scalar_equals "SELECT COUNT(*) FROM request_status_history;" "0"
  echo "[verify-auth-runtime-domain] ✅ auth runtime flow does not create domain rows"
else
  echo "[verify-auth-runtime-domain] ⚠️ SQL-проверки пропущены: используется внешняя БД (TEST_DATABASE_URL)"
fi

backend_runtime_ensure_alive

echo "[verify-auth-runtime-domain] 🎉 Runtime auth/domain safety check пройден"
