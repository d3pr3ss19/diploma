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
  echo "[verify-auth-no-seed] ❌ $1" >&2
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

TEMP_PG_LABEL="verify-auth-no-seed"
TEMP_PG_DB_NAME="${VERIFY_AUTH_NO_SEED_DB_NAME:-diploma_verify_no_seed}"
TEMP_PG_DB_USER="${VERIFY_AUTH_NO_SEED_DB_USER:-postgres}"
TEMP_PG_DB_PASSWORD="${VERIFY_AUTH_NO_SEED_DB_PASSWORD:-postgres}"
TEMP_PG_DB_IMAGE="${VERIFY_AUTH_NO_SEED_DB_IMAGE:-postgres:16-alpine}"
TEMP_PG_DB_PORT="${VERIFY_AUTH_NO_SEED_DB_PORT:-}"
TEMP_PG_DATABASE_URL="${TEST_DATABASE_URL:-}"
BACKEND_PORT="${VERIFY_AUTH_NO_SEED_PORT:-3200}"
BASE_URL="${BASE_URL:-http://127.0.0.1:${BACKEND_PORT}/api/v1}"
AUTH_JWT_SECRET="${AUTH_JWT_SECRET:-verify-auth-no-seed-secret}"
WAIT_TIMEOUT="${WAIT_TIMEOUT:-60}"
WAIT_INTERVAL="${WAIT_INTERVAL:-1}"
LOGIN_EMAIL="${VERIFY_AUTH_NO_SEED_EMAIL:-operator@kp.local}"
LOGIN_PASSWORD="${VERIFY_AUTH_NO_SEED_PASSWORD:-password123}"

TMP_DIR="$(mktemp -d)"
BACKEND_LOG="$TMP_DIR/backend.log"
LOGIN_RESPONSE="$TMP_DIR/login.json"

temp_pg_setup

run_backend_step() {
  local title="$1"
  shift
  echo "[verify-auth-no-seed] ▶ $title"
  (
    cd "$BACKEND_DIR"
    DATABASE_URL="$TEMP_PG_DATABASE_URL" "$@"
  )
  echo "[verify-auth-no-seed] ✅ $title"
}

run_backend_step "prisma generate" npm run prisma:generate
run_backend_step "prisma migrate deploy" npm run prisma:migrate:deploy

BACKEND_RUNTIME_LABEL="verify-auth-no-seed"
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

HEALTH_CODE="$(curl -sS -o /dev/null -w "%{http_code}" "$BASE_URL/health")"
[[ "$HEALTH_CODE" == "200" ]] || fail "health endpoint вернул HTTP $HEALTH_CODE"
echo "[verify-auth-no-seed] ✅ health endpoint available without seeded users"

LOGIN_CODE="$(curl -sS -o "$LOGIN_RESPONSE" -w "%{http_code}" \
  -X POST "$BASE_URL/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$LOGIN_EMAIL\",\"password\":\"$LOGIN_PASSWORD\"}")"
[[ "$LOGIN_CODE" == "401" ]] || fail "ожидался 401 для login без seed пользователей, получен $LOGIN_CODE"
grep -q 'Invalid email or password' "$LOGIN_RESPONSE" || fail "login без seed не вернул ожидаемое сообщение об ошибке"
echo "[verify-auth-no-seed] ✅ login is rejected before seeding users"

PROTECTED_CODE="$(curl -sS -o /dev/null -w "%{http_code}" "$BASE_URL/requests")"
[[ "$PROTECTED_CODE" == "401" ]] || fail "ожидался 401 на защищённом endpoint без токена, получен $PROTECTED_CODE"
echo "[verify-auth-no-seed] ✅ protected endpoint still rejects missing bearer token"

backend_runtime_ensure_alive

echo "[verify-auth-no-seed] 🎉 Negative auth smoke-check без seed пользователей пройден"
