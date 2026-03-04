#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000/api/v1}"
EMAIL="${SMOKE_EMAIL:-operator@example.com}"
PASSWORD="${SMOKE_PASSWORD:-password123}"
ROLE="${SMOKE_ROLE:-OPERATOR}"

fail() {
  echo "[smoke] ❌ $1" >&2
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "Требуется команда '$1'"
}

require_cmd curl

WAIT_TIMEOUT="${WAIT_TIMEOUT:-30}"
WAIT_INTERVAL="${WAIT_INTERVAL:-1}"

"$(dirname "$0")/wait-for-http.sh" "$BASE_URL/health" "$WAIT_TIMEOUT" "$WAIT_INTERVAL"

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

HEALTH_FILE="$TMP_DIR/health.json"
LOGIN_FILE="$TMP_DIR/login.json"

echo "[smoke] Проверка health: $BASE_URL/health"
HEALTH_CODE="$(curl -sS -o "$HEALTH_FILE" -w "%{http_code}" "$BASE_URL/health")"
[[ "$HEALTH_CODE" == "200" ]] || fail "health вернул HTTP $HEALTH_CODE"
grep -q '"status"[[:space:]]*:[[:space:]]*"ok"' "$HEALTH_FILE" || fail "health не содержит status=ok"

echo "[smoke] Проверка login: $BASE_URL/auth/login"
LOGIN_CODE="$(curl -sS -o "$LOGIN_FILE" -w "%{http_code}" \
  -X POST "$BASE_URL/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"role\":\"$ROLE\"}")"
[[ "$LOGIN_CODE" == "201" || "$LOGIN_CODE" == "200" ]] || fail "login вернул HTTP $LOGIN_CODE"
grep -q '"accessToken"' "$LOGIN_FILE" || fail "login не вернул accessToken"
grep -q '"refreshToken"' "$LOGIN_FILE" || fail "login не вернул refreshToken"

echo "[smoke] ✅ Smoke backend пройден успешно"
