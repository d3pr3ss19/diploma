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
  echo "[verify-auth-logout-empty-token] ❌ $1" >&2
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

TEMP_PG_LABEL="verify-auth-logout-empty-token"
TEMP_PG_DB_NAME="${VERIFY_AUTH_LOGOUT_EMPTY_DB_NAME:-diploma_verify_logout_empty}"
TEMP_PG_DB_USER="${VERIFY_AUTH_LOGOUT_EMPTY_DB_USER:-postgres}"
TEMP_PG_DB_PASSWORD="${VERIFY_AUTH_LOGOUT_EMPTY_DB_PASSWORD:-postgres}"
TEMP_PG_DB_IMAGE="${VERIFY_AUTH_LOGOUT_EMPTY_DB_IMAGE:-postgres:16-alpine}"
TEMP_PG_DB_PORT="${VERIFY_AUTH_LOGOUT_EMPTY_DB_PORT:-}"
TEMP_PG_DATABASE_URL="${TEST_DATABASE_URL:-}"
BACKEND_PORT="${VERIFY_AUTH_LOGOUT_EMPTY_PORT:-3850}"
BASE_URL="${BASE_URL:-http://127.0.0.1:${BACKEND_PORT}/api/v1}"
AUTH_JWT_SECRET="${AUTH_JWT_SECRET:-verify-auth-logout-empty-secret}"
WAIT_TIMEOUT="${WAIT_TIMEOUT:-60}"
WAIT_INTERVAL="${WAIT_INTERVAL:-1}"
LOGIN_EMAIL="${VERIFY_AUTH_LOGOUT_EMPTY_EMAIL:-operator@kp.local}"
LOGIN_PASSWORD="${VERIFY_AUTH_LOGOUT_EMPTY_PASSWORD:-password123}"

TMP_DIR="$(mktemp -d)"
BACKEND_LOG="$TMP_DIR/backend.log"
LOGIN_RESPONSE="$TMP_DIR/login.json"
EMPTY_LOGOUT_RESPONSE="$TMP_DIR/logout-empty.json"

temp_pg_setup

[[ -n "${TEMP_PG_CONTAINER_ID:-}" ]] || fail "SQL-проверка logout empty-token требует временную container-БД; внешний TEST_DATABASE_URL не поддерживается"

run_backend_step() {
  local title="$1"
  shift
  echo "[verify-auth-logout-empty-token] ▶ $title"
  (
    cd "$BACKEND_DIR"
    DATABASE_URL="$TEMP_PG_DATABASE_URL" "$@"
  )
  echo "[verify-auth-logout-empty-token] ✅ $title"
}

extract_json_field() {
  local file="$1"
  local field="$2"

  python3 - <<'PY' "$file" "$field"
import json
import sys

file_path, field = sys.argv[1], sys.argv[2]
with open(file_path, 'r', encoding='utf-8') as f:
    data = json.load(f)
value = data.get(field)
if not isinstance(value, str) or not value:
    raise SystemExit(1)
print(value)
PY
}

hash_token() {
  local token="$1"

  python3 - <<'PY' "$token"
import hashlib
import sys

print(hashlib.sha256(sys.argv[1].encode('utf-8')).hexdigest())
PY
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

BACKEND_RUNTIME_LABEL="verify-auth-logout-empty-token"
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

USER_ID="$(temp_pg_exec_psql "SELECT id FROM users WHERE email = '$LOGIN_EMAIL' LIMIT 1;")"
[[ -n "$USER_ID" ]] || fail "Не найден auth-пользователь для $LOGIN_EMAIL"

LOGIN_CODE="$(curl -sS -o "$LOGIN_RESPONSE" -w "%{http_code}" \
  -X POST "$BASE_URL/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$LOGIN_EMAIL\",\"password\":\"$LOGIN_PASSWORD\"}")"
[[ "$LOGIN_CODE" == "200" || "$LOGIN_CODE" == "201" ]] || fail "login вернул HTTP $LOGIN_CODE"
REFRESH_TOKEN="$(extract_json_field "$LOGIN_RESPONSE" "refreshToken")" || fail "login не вернул refreshToken"
REFRESH_HASH="$(hash_token "$REFRESH_TOKEN")"

assert_scalar_equals "SELECT COUNT(*) FROM refresh_sessions WHERE user_id = '$USER_ID';" "1"
assert_scalar_equals "SELECT COUNT(*) FROM refresh_sessions WHERE user_id = '$USER_ID' AND revoked_at IS NULL;" "1"
assert_scalar_equals "SELECT COUNT(*) FROM refresh_sessions WHERE user_id = '$USER_ID' AND token_hash = '$REFRESH_HASH' AND revoked_at IS NULL;" "1"
echo "[verify-auth-logout-empty-token] ✅ создана одна активная refresh_session"

EMPTY_LOGOUT_CODE="$(curl -sS -o "$EMPTY_LOGOUT_RESPONSE" -w "%{http_code}" \
  -X POST "$BASE_URL/auth/logout" \
  -H 'Content-Type: application/json' \
  -d '{"refreshToken":""}')"
[[ "$EMPTY_LOGOUT_CODE" == "200" || "$EMPTY_LOGOUT_CODE" == "201" ]] || fail "logout(empty token) вернул HTTP $EMPTY_LOGOUT_CODE"
grep -q '"success"[[:space:]]*:[[:space:]]*true' "$EMPTY_LOGOUT_RESPONSE" || fail "logout(empty token) не вернул success=true"

assert_scalar_equals "SELECT COUNT(*) FROM refresh_sessions WHERE user_id = '$USER_ID';" "1"
assert_scalar_equals "SELECT COUNT(*) FROM refresh_sessions WHERE user_id = '$USER_ID' AND revoked_at IS NULL;" "1"
assert_scalar_equals "SELECT COUNT(*) FROM refresh_sessions WHERE user_id = '$USER_ID' AND token_hash = '$REFRESH_HASH' AND revoked_at IS NULL;" "1"
echo "[verify-auth-logout-empty-token] ✅ logout с пустым refreshToken не портит состояние refresh_sessions"

VALID_REFRESH_CODE="$(curl -sS -o /dev/null -w "%{http_code}" \
  -X POST "$BASE_URL/auth/refresh" \
  -H 'Content-Type: application/json' \
  -d "{\"refreshToken\":\"$REFRESH_TOKEN\"}")"
[[ "$VALID_REFRESH_CODE" == "200" || "$VALID_REFRESH_CODE" == "201" ]] || fail "ожидался успешный refresh после logout(empty token), получен $VALID_REFRESH_CODE"
echo "[verify-auth-logout-empty-token] ✅ исходная активная сессия остаётся рабочей"

backend_runtime_ensure_alive

echo "[verify-auth-logout-empty-token] 🎉 Logout(empty token) verify-check пройден"
