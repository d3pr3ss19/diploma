#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000/api/v1}"
EMAIL="${E2E_EMAIL:-operator@example.com}"
PASSWORD="${E2E_PASSWORD:-password123}"
ROLE="${E2E_ROLE:-OPERATOR}"

fail() {
  echo "[e2e-api] ❌ $1" >&2
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "Требуется команда '$1'"
}

require_cmd curl

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
"$SCRIPT_DIR/wait-for-http.sh" "$BASE_URL/health" "${WAIT_TIMEOUT:-30}" "${WAIT_INTERVAL:-1}"

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

LOGIN_FILE="$TMP_DIR/login.json"
INVALID_LOGIN_FILE="$TMP_DIR/invalid-login.json"

# 0) Invalid payload must be rejected by validation
INVALID_LOGIN_CODE="$(curl -sS -o "$INVALID_LOGIN_FILE" -w "%{http_code}" \
  -X POST "$BASE_URL/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"not-an-email","password":"short","role":"INVALID"}')"
[[ "$INVALID_LOGIN_CODE" == "400" ]] || fail "ожидался 400 для невалидного payload login, получен $INVALID_LOGIN_CODE"

# 1) Login and extract token
LOGIN_CODE="$(curl -sS -o "$LOGIN_FILE" -w "%{http_code}" \
  -X POST "$BASE_URL/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"role\":\"$ROLE\"}")"
[[ "$LOGIN_CODE" == "200" || "$LOGIN_CODE" == "201" ]] || fail "login вернул HTTP $LOGIN_CODE"

grep -q '"accessToken"' "$LOGIN_FILE" || fail "login не вернул accessToken"
TOKEN="$(sed -n 's/.*"accessToken"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$LOGIN_FILE" | head -n1)"
[[ -n "$TOKEN" ]] || fail "не удалось извлечь accessToken"

# 2) Missing token should be unauthorized on protected endpoint
MISSING_CODE="$(curl -sS -o /dev/null -w "%{http_code}" "$BASE_URL/requests")"
[[ "$MISSING_CODE" == "401" ]] || fail "ожидался 401 без токена, получен $MISSING_CODE"

# 3) Invalid token should be unauthorized
INVALID_CODE="$(curl -sS -o /dev/null -w "%{http_code}" \
  -H 'Authorization: Bearer invalid-token' \
  "$BASE_URL/requests")"
[[ "$INVALID_CODE" == "401" ]] || fail "ожидался 401 с невалидным токеном, получен $INVALID_CODE"

# 4) Valid token should pass auth layer (usually 200, but not 401/403)
VALID_CODE="$(curl -sS -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/requests")"
if [[ "$VALID_CODE" == "401" || "$VALID_CODE" == "403" ]]; then
  fail "с валидным токеном получен $VALID_CODE (ожидалось прохождение auth)"
fi

# 5) Token with hyphenated user-id (UUID-like) should pass auth parsing
UUID_LIKE_TOKEN='demo-OPERATOR-123e4567-e89b-12d3-a456-426614174000'
UUID_TOKEN_CODE="$(curl -sS -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $UUID_LIKE_TOKEN" \
  "$BASE_URL/requests")"
if [[ "$UUID_TOKEN_CODE" == "401" || "$UUID_TOKEN_CODE" == "403" ]]; then
  fail "токен с UUID user-id отклонён auth-guard'ом: HTTP $UUID_TOKEN_CODE"
fi

echo "[e2e-api] ✅ E2E auth-flow пройден (HTTP with valid token: $VALID_CODE, UUID-token: $UUID_TOKEN_CODE)"
