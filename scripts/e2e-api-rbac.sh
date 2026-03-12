#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000/api/v1}"
OPERATOR_EMAIL="${E2E_OPERATOR_EMAIL:-operator@kp.local}"
OPERATOR_PASSWORD="${E2E_OPERATOR_PASSWORD:-password123}"
SUBSCRIBER_EMAIL="${E2E_SUBSCRIBER_EMAIL:-subscriber@kp.local}"
SUBSCRIBER_PASSWORD="${E2E_SUBSCRIBER_PASSWORD:-password123}"

fail() {
  echo "[e2e-rbac] ❌ $1" >&2
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "Требуется команда '$1'"
}

extract_token() {
  local email="$1"
  local password="$2"
  local out_file="$3"
  local code

  code="$(curl -sS -o "$out_file" -w "%{http_code}" \
    -X POST "$BASE_URL/auth/login" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"$email\",\"password\":\"$password\"}")"

  [[ "$code" == "200" || "$code" == "201" ]] || fail "login($email) вернул HTTP $code"

  python3 "$EXTRACT_TOKEN_SCRIPT" "$out_file" || fail "не удалось извлечь accessToken для $email"
}

require_cmd curl
require_cmd python3

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EXTRACT_TOKEN_SCRIPT="$SCRIPT_DIR/extract-access-token.py"
[[ -f "$EXTRACT_TOKEN_SCRIPT" ]] || fail "Не найден helper: $EXTRACT_TOKEN_SCRIPT"
"$SCRIPT_DIR/wait-for-http.sh" "$BASE_URL/health" "${WAIT_TIMEOUT:-30}" "${WAIT_INTERVAL:-1}"

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

SUBSCRIBER_TOKEN="$(extract_token "$SUBSCRIBER_EMAIL" "$SUBSCRIBER_PASSWORD" "$TMP_DIR/subscriber-login.json")"
OPERATOR_TOKEN="$(extract_token "$OPERATOR_EMAIL" "$OPERATOR_PASSWORD" "$TMP_DIR/operator-login.json")"

# SUBSCRIBER must NOT access /subscribers list (ADMIN/OPERATOR only)
SUBSCRIBER_CODE="$(curl -sS -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $SUBSCRIBER_TOKEN" \
  "$BASE_URL/subscribers")"
[[ "$SUBSCRIBER_CODE" == "403" ]] || fail "ожидался 403 для SUBSCRIBER на /subscribers, получен $SUBSCRIBER_CODE"

# OPERATOR should pass RBAC for /subscribers (status may vary, but not 401/403)
OPERATOR_CODE="$(curl -sS -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $OPERATOR_TOKEN" \
  "$BASE_URL/subscribers")"
if [[ "$OPERATOR_CODE" == "401" || "$OPERATOR_CODE" == "403" ]]; then
  fail "ожидалось прохождение RBAC для OPERATOR на /subscribers, получен $OPERATOR_CODE"
fi

# Tampered token must be rejected by auth layer
TAMPERED_TOKEN="${OPERATOR_TOKEN%?}x"
TAMPERED_CODE="$(curl -sS -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $TAMPERED_TOKEN" \
  "$BASE_URL/subscribers")"
[[ "$TAMPERED_CODE" == "401" ]] || fail "ожидался 401 для подменённого токена, получен $TAMPERED_CODE"

# Invalid UUID must be rejected by route param validation
INVALID_UUID_CODE="$(curl -sS -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $OPERATOR_TOKEN" \
  "$BASE_URL/requests/not-a-uuid")"
[[ "$INVALID_UUID_CODE" == "400" ]] || fail "ожидался 400 для невалидного UUID path-param, получен $INVALID_UUID_CODE"

echo "[e2e-rbac] ✅ RBAC e2e пройден (SUBSCRIBER=$SUBSCRIBER_CODE, OPERATOR=$OPERATOR_CODE, TAMPERED=$TAMPERED_CODE, INVALID_UUID=$INVALID_UUID_CODE)"
