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
  echo "[verify-auth-multi-login] ❌ $1" >&2
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

TEMP_PG_LABEL="verify-auth-multi-login"
TEMP_PG_DB_NAME="${VERIFY_AUTH_MULTI_LOGIN_DB_NAME:-diploma_verify_multi_login}"
TEMP_PG_DB_USER="${VERIFY_AUTH_MULTI_LOGIN_DB_USER:-postgres}"
TEMP_PG_DB_PASSWORD="${VERIFY_AUTH_MULTI_LOGIN_DB_PASSWORD:-postgres}"
TEMP_PG_DB_IMAGE="${VERIFY_AUTH_MULTI_LOGIN_DB_IMAGE:-postgres:16-alpine}"
TEMP_PG_DB_PORT="${VERIFY_AUTH_MULTI_LOGIN_DB_PORT:-}"
TEMP_PG_DATABASE_URL="${TEST_DATABASE_URL:-}"
BACKEND_PORT="${VERIFY_AUTH_MULTI_LOGIN_PORT:-3650}"
BASE_URL="${BASE_URL:-http://127.0.0.1:${BACKEND_PORT}/api/v1}"
AUTH_JWT_SECRET="${AUTH_JWT_SECRET:-verify-auth-multi-login-secret}"
WAIT_TIMEOUT="${WAIT_TIMEOUT:-60}"
WAIT_INTERVAL="${WAIT_INTERVAL:-1}"
LOGIN_EMAIL="${VERIFY_AUTH_MULTI_LOGIN_EMAIL:-operator@kp.local}"
LOGIN_PASSWORD="${VERIFY_AUTH_MULTI_LOGIN_PASSWORD:-password123}"

TMP_DIR="$(mktemp -d)"
BACKEND_LOG="$TMP_DIR/backend.log"
FIRST_LOGIN_RESPONSE="$TMP_DIR/first-login.json"
SECOND_LOGIN_RESPONSE="$TMP_DIR/second-login.json"

temp_pg_setup

[[ -n "${TEMP_PG_CONTAINER_ID:-}" ]] || fail "SQL-проверка multiple login требует временную container-БД; внешний TEST_DATABASE_URL не поддерживается"

run_backend_step() {
  local title="$1"
  shift
  echo "[verify-auth-multi-login] ▶ $title"
  (
    cd "$BACKEND_DIR"
    DATABASE_URL="$TEMP_PG_DATABASE_URL" "$@"
  )
  echo "[verify-auth-multi-login] ✅ $title"
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

BACKEND_RUNTIME_LABEL="verify-auth-multi-login"
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

FIRST_LOGIN_CODE="$(curl -sS -o "$FIRST_LOGIN_RESPONSE" -w "%{http_code}" \
  -X POST "$BASE_URL/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$LOGIN_EMAIL\",\"password\":\"$LOGIN_PASSWORD\"}")"
[[ "$FIRST_LOGIN_CODE" == "200" || "$FIRST_LOGIN_CODE" == "201" ]] || fail "первый login вернул HTTP $FIRST_LOGIN_CODE"
FIRST_REFRESH="$(extract_json_field "$FIRST_LOGIN_RESPONSE" "refreshToken")" || fail "первый login не вернул refreshToken"
FIRST_HASH="$(hash_token "$FIRST_REFRESH")"

assert_scalar_equals "SELECT COUNT(*) FROM refresh_sessions WHERE user_id = '$USER_ID';" "1"
assert_scalar_equals "SELECT COUNT(*) FROM refresh_sessions WHERE user_id = '$USER_ID' AND revoked_at IS NULL;" "1"
assert_scalar_equals "SELECT COUNT(*) FROM refresh_sessions WHERE user_id = '$USER_ID' AND revoked_at IS NOT NULL;" "0"
assert_scalar_equals "SELECT COUNT(*) FROM refresh_sessions WHERE user_id = '$USER_ID' AND token_hash = '$FIRST_HASH' AND revoked_at IS NULL;" "1"
echo "[verify-auth-multi-login] ✅ первый login создаёт одну активную refresh_session"

SECOND_LOGIN_CODE="$(curl -sS -o "$SECOND_LOGIN_RESPONSE" -w "%{http_code}" \
  -X POST "$BASE_URL/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$LOGIN_EMAIL\",\"password\":\"$LOGIN_PASSWORD\"}")"
[[ "$SECOND_LOGIN_CODE" == "200" || "$SECOND_LOGIN_CODE" == "201" ]] || fail "второй login вернул HTTP $SECOND_LOGIN_CODE"
SECOND_REFRESH="$(extract_json_field "$SECOND_LOGIN_RESPONSE" "refreshToken")" || fail "второй login не вернул refreshToken"
[[ "$SECOND_REFRESH" != "$FIRST_REFRESH" ]] || fail "второй login вернул тот же refreshToken"
SECOND_HASH="$(hash_token "$SECOND_REFRESH")"

assert_scalar_equals "SELECT COUNT(*) FROM refresh_sessions WHERE user_id = '$USER_ID';" "2"
assert_scalar_equals "SELECT COUNT(*) FROM refresh_sessions WHERE user_id = '$USER_ID' AND revoked_at IS NULL;" "1"
assert_scalar_equals "SELECT COUNT(*) FROM refresh_sessions WHERE user_id = '$USER_ID' AND revoked_at IS NOT NULL;" "1"
assert_scalar_equals "SELECT COUNT(*) FROM refresh_sessions WHERE user_id = '$USER_ID' AND token_hash = '$FIRST_HASH' AND revoked_at IS NOT NULL;" "1"
assert_scalar_equals "SELECT COUNT(*) FROM refresh_sessions WHERE user_id = '$USER_ID' AND token_hash = '$SECOND_HASH' AND revoked_at IS NULL;" "1"
echo "[verify-auth-multi-login] ✅ второй login ревокает предыдущую сессию и оставляет только одну активную"

FIRST_REFRESH_AFTER_SECOND_LOGIN_CODE="$(curl -sS -o /dev/null -w "%{http_code}" \
  -X POST "$BASE_URL/auth/refresh" \
  -H 'Content-Type: application/json' \
  -d "{\"refreshToken\":\"$FIRST_REFRESH\"}")"
[[ "$FIRST_REFRESH_AFTER_SECOND_LOGIN_CODE" == "401" ]] || fail "ожидался 401 для первого refresh token после второго login, получен $FIRST_REFRESH_AFTER_SECOND_LOGIN_CODE"

SECOND_REFRESH_CODE="$(curl -sS -o /dev/null -w "%{http_code}" \
  -X POST "$BASE_URL/auth/refresh" \
  -H 'Content-Type: application/json' \
  -d "{\"refreshToken\":\"$SECOND_REFRESH\"}")"
[[ "$SECOND_REFRESH_CODE" == "200" || "$SECOND_REFRESH_CODE" == "201" ]] || fail "ожидался успешный refresh для второго login, получен $SECOND_REFRESH_CODE"
echo "[verify-auth-multi-login] ✅ только последняя активная refresh_session остаётся рабочей"

backend_runtime_ensure_alive

echo "[verify-auth-multi-login] 🎉 Multiple login verify-check пройден"
