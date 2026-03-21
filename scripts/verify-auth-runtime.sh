#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
SCRIPT_DIR="$ROOT_DIR/scripts"
# shellcheck source=./lib/temp-postgres.sh
source "$ROOT_DIR/scripts/lib/temp-postgres.sh"

fail() {
  echo "[verify-auth-runtime] ❌ $1" >&2
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "Требуется команда '$1'"
}

cleanup() {
  if [[ -n "${BACKEND_PID:-}" ]]; then
    kill "$BACKEND_PID" >/dev/null 2>&1 || true
    wait "$BACKEND_PID" >/dev/null 2>&1 || true
  fi

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

TEMP_PG_LABEL="verify-auth-runtime"
TEMP_PG_DB_NAME="${VERIFY_AUTH_RUNTIME_DB_NAME:-diploma_verify_runtime}"
TEMP_PG_DB_USER="${VERIFY_AUTH_RUNTIME_DB_USER:-postgres}"
TEMP_PG_DB_PASSWORD="${VERIFY_AUTH_RUNTIME_DB_PASSWORD:-postgres}"
TEMP_PG_DB_IMAGE="${VERIFY_AUTH_RUNTIME_DB_IMAGE:-postgres:16-alpine}"
TEMP_PG_DB_PORT="${VERIFY_AUTH_RUNTIME_DB_PORT:-}"
TEMP_PG_DATABASE_URL="${TEST_DATABASE_URL:-}"
BACKEND_PORT="${VERIFY_AUTH_RUNTIME_PORT:-3100}"
BASE_URL="${BASE_URL:-http://127.0.0.1:${BACKEND_PORT}/api/v1}"
AUTH_JWT_SECRET="${AUTH_JWT_SECRET:-verify-auth-runtime-secret}"
WAIT_TIMEOUT="${WAIT_TIMEOUT:-60}"
WAIT_INTERVAL="${WAIT_INTERVAL:-1}"

TMP_DIR="$(mktemp -d)"
BACKEND_LOG="$TMP_DIR/backend.log"

temp_pg_setup

ensure_backend_alive() {
  if [[ -n "${BACKEND_PID:-}" ]] && ! kill -0 "$BACKEND_PID" >/dev/null 2>&1; then
    echo "[verify-auth-runtime] --- backend log ---" >&2
    cat "$BACKEND_LOG" >&2 || true
    fail "Backend завершился раньше времени"
  fi
}

run_backend_step() {
  local title="$1"
  shift
  echo "[verify-auth-runtime] ▶ $title"
  (
    cd "$BACKEND_DIR"
    DATABASE_URL="$TEMP_PG_DATABASE_URL" "$@"
  )
  echo "[verify-auth-runtime] ✅ $title"
}

run_backend_step "prisma generate" npm run prisma:generate
run_backend_step "prisma migrate deploy" npm run prisma:migrate:deploy
run_backend_step "seed auth users" npm run seed:auth-users

echo "[verify-auth-runtime] ▶ start backend"
(
  cd "$BACKEND_DIR"
  DATABASE_URL="$TEMP_PG_DATABASE_URL" \
  PORT="$BACKEND_PORT" \
  AUTH_JWT_SECRET="$AUTH_JWT_SECRET" \
  npm exec -- ts-node --transpile-only src/main.ts
) >"$BACKEND_LOG" 2>&1 &
BACKEND_PID=$!

"$SCRIPT_DIR/wait-for-http.sh" "$BASE_URL/health" "$WAIT_TIMEOUT" "$WAIT_INTERVAL" || {
  echo "[verify-auth-runtime] --- backend log ---" >&2
  cat "$BACKEND_LOG" >&2 || true
  fail "Backend не поднялся вовремя"
}
ensure_backend_alive

echo "[verify-auth-runtime] ✅ backend started on $BASE_URL"

echo "[verify-auth-runtime] ▶ smoke backend"
BASE_URL="$BASE_URL" "$SCRIPT_DIR/smoke-backend.sh"
echo "[verify-auth-runtime] ✅ smoke backend"
ensure_backend_alive

echo "[verify-auth-runtime] ▶ auth integration e2e"
BASE_URL="$BASE_URL" \
E2E_OPERATOR_EMAIL="${E2E_OPERATOR_EMAIL:-operator@kp.local}" \
E2E_OPERATOR_PASSWORD="${E2E_OPERATOR_PASSWORD:-password123}" \
E2E_SUBSCRIBER_EMAIL="${E2E_SUBSCRIBER_EMAIL:-subscriber@kp.local}" \
E2E_SUBSCRIBER_PASSWORD="${E2E_SUBSCRIBER_PASSWORD:-password123}" \
WAIT_TIMEOUT="$WAIT_TIMEOUT" \
WAIT_INTERVAL="$WAIT_INTERVAL" \
"$SCRIPT_DIR/e2e-api-auth-integration.sh"
echo "[verify-auth-runtime] ✅ auth integration e2e"
ensure_backend_alive

echo "[verify-auth-runtime] 🎉 Runtime auth smoke-check пройден"
