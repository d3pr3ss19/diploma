#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000/api/v1}"
OPERATOR_EMAIL="${E2E_OPERATOR_EMAIL:-operator@kp.local}"
OPERATOR_PASSWORD="${E2E_OPERATOR_PASSWORD:-password123}"
SUBSCRIBER_EMAIL="${E2E_SUBSCRIBER_EMAIL:-subscriber@kp.local}"
SUBSCRIBER_PASSWORD="${E2E_SUBSCRIBER_PASSWORD:-password123}"

fail() {
  echo "[e2e-auth-int] ❌ $1" >&2
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "Требуется команда '$1'"
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

login() {
  local email="$1"
  local password="$2"
  local out_file="$3"

  curl -sS -o "$out_file" -w "%{http_code}" \
    -X POST "$BASE_URL/auth/login" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"$email\",\"password\":\"$password\"}"
}

require_cmd curl
require_cmd python3

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
"$SCRIPT_DIR/wait-for-http.sh" "$BASE_URL/health" "${WAIT_TIMEOUT:-30}" "${WAIT_INTERVAL:-1}"

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

# 1) wrong password
WRONG_LOGIN_CODE="$(login "$OPERATOR_EMAIL" "bad-password" "$TMP_DIR/wrong-login.json")"
[[ "$WRONG_LOGIN_CODE" == "401" ]] || fail "ожидался 401 при неверном пароле, получен $WRONG_LOGIN_CODE"

# 2) operator login
OP_LOGIN_CODE="$(login "$OPERATOR_EMAIL" "$OPERATOR_PASSWORD" "$TMP_DIR/operator-login.json")"
[[ "$OP_LOGIN_CODE" == "200" || "$OP_LOGIN_CODE" == "201" ]] || fail "login(operator) вернул HTTP $OP_LOGIN_CODE"
OP_ACCESS="$(extract_json_field "$TMP_DIR/operator-login.json" "accessToken")" || fail "operator login не вернул accessToken"
OP_REFRESH="$(extract_json_field "$TMP_DIR/operator-login.json" "refreshToken")" || fail "operator login не вернул refreshToken"

# 3) subscriber login
SUB_LOGIN_CODE="$(login "$SUBSCRIBER_EMAIL" "$SUBSCRIBER_PASSWORD" "$TMP_DIR/subscriber-login.json")"
[[ "$SUB_LOGIN_CODE" == "200" || "$SUB_LOGIN_CODE" == "201" ]] || fail "login(subscriber) вернул HTTP $SUB_LOGIN_CODE"
SUB_ACCESS="$(extract_json_field "$TMP_DIR/subscriber-login.json" "accessToken")" || fail "subscriber login не вернул accessToken"

# 4) refresh with access token must fail
REFRESH_WITH_ACCESS_CODE="$(curl -sS -o /dev/null -w "%{http_code}" \
  -X POST "$BASE_URL/auth/refresh" \
  -H 'Content-Type: application/json' \
  -d "{\"refreshToken\":\"$OP_ACCESS\"}")"
[[ "$REFRESH_WITH_ACCESS_CODE" == "401" ]] || fail "ожидался 401 при refresh(access token), получен $REFRESH_WITH_ACCESS_CODE"

# 5) refresh with refresh token must succeed and rotate refresh token
REFRESH_CODE="$(curl -sS -o "$TMP_DIR/refresh.json" -w "%{http_code}" \
  -X POST "$BASE_URL/auth/refresh" \
  -H 'Content-Type: application/json' \
  -d "{\"refreshToken\":\"$OP_REFRESH\"}")"
[[ "$REFRESH_CODE" == "200" || "$REFRESH_CODE" == "201" ]] || fail "refresh вернул HTTP $REFRESH_CODE"
NEW_ACCESS="$(extract_json_field "$TMP_DIR/refresh.json" "accessToken")" || fail "refresh не вернул accessToken"
NEW_REFRESH="$(extract_json_field "$TMP_DIR/refresh.json" "refreshToken")" || fail "refresh не вернул refreshToken"
[[ "$NEW_ACCESS" != "$OP_ACCESS" ]] || fail "refresh вернул тот же accessToken"
[[ "$NEW_REFRESH" != "$OP_REFRESH" ]] || fail "refresh не выполнил ротацию refresh token"

# 6) old refresh token must be revoked after rotation
OLD_REFRESH_CODE="$(curl -sS -o /dev/null -w "%{http_code}" \
  -X POST "$BASE_URL/auth/refresh" \
  -H 'Content-Type: application/json' \
  -d "{\"refreshToken\":\"$OP_REFRESH\"}")"
[[ "$OLD_REFRESH_CODE" == "401" ]] || fail "ожидался 401 для старого refresh token после ротации, получен $OLD_REFRESH_CODE"

# 7) refresh token must not work as Bearer access token on protected endpoint
REFRESH_AS_BEARER_CODE="$(curl -sS -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $NEW_REFRESH" \
  "$BASE_URL/requests")"
[[ "$REFRESH_AS_BEARER_CODE" == "401" ]] || fail "ожидался 401 для refresh token как Bearer access, получен $REFRESH_AS_BEARER_CODE"

# 8) logout invalidates current refresh token
LOGOUT_CODE="$(curl -sS -o "$TMP_DIR/logout.json" -w "%{http_code}" \
  -X POST "$BASE_URL/auth/logout" \
  -H 'Content-Type: application/json' \
  -d "{\"refreshToken\":\"$NEW_REFRESH\"}")"
[[ "$LOGOUT_CODE" == "200" || "$LOGOUT_CODE" == "201" ]] || fail "logout вернул HTTP $LOGOUT_CODE"
grep -q '"success"[[:space:]]*:[[:space:]]*true' "$TMP_DIR/logout.json" || fail "logout не вернул success=true"

POST_LOGOUT_REFRESH_CODE="$(curl -sS -o /dev/null -w "%{http_code}" \
  -X POST "$BASE_URL/auth/refresh" \
  -H 'Content-Type: application/json' \
  -d "{\"refreshToken\":\"$NEW_REFRESH\"}")"
[[ "$POST_LOGOUT_REFRESH_CODE" == "401" ]] || fail "ожидался 401 для refresh после logout, получен $POST_LOGOUT_REFRESH_CODE"

# 9) guard + RBAC behavior
SUBSCRIBER_TO_SUBSCRIBERS_CODE="$(curl -sS -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $SUB_ACCESS" \
  "$BASE_URL/subscribers")"
[[ "$SUBSCRIBER_TO_SUBSCRIBERS_CODE" == "403" ]] || fail "ожидался 403 для subscriber на /subscribers, получен $SUBSCRIBER_TO_SUBSCRIBERS_CODE"

OPERATOR_TO_SUBSCRIBERS_CODE="$(curl -sS -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $OP_ACCESS" \
  "$BASE_URL/subscribers")"
if [[ "$OPERATOR_TO_SUBSCRIBERS_CODE" == "401" || "$OPERATOR_TO_SUBSCRIBERS_CODE" == "403" ]]; then
  fail "ожидался доступ operator к /subscribers, получен $OPERATOR_TO_SUBSCRIBERS_CODE"
fi

echo "[e2e-auth-int] ✅ Auth integration пройден (wrong=$WRONG_LOGIN_CODE, refresh=$REFRESH_CODE, old-refresh=$OLD_REFRESH_CODE, refresh-bearer=$REFRESH_AS_BEARER_CODE, logout=$LOGOUT_CODE, post-logout-refresh=$POST_LOGOUT_REFRESH_CODE, sub403=$SUBSCRIBER_TO_SUBSCRIBERS_CODE, op=$OPERATOR_TO_SUBSCRIBERS_CODE)"
