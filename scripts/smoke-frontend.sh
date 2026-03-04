#!/usr/bin/env bash
set -euo pipefail

FRONTEND_URL="${FRONTEND_URL:-http://localhost:5173}"
LOGIN_PATH="${LOGIN_PATH:-/login}"

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

"$(dirname "$0")/wait-for-http.sh" "$FRONTEND_URL" "$WAIT_TIMEOUT" "$WAIT_INTERVAL"

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

INDEX_FILE="$TMP_DIR/index.html"
LOGIN_FILE="$TMP_DIR/login.html"

echo "[smoke] Проверка frontend index: $FRONTEND_URL"
INDEX_CODE="$(curl -sS -L -o "$INDEX_FILE" -w "%{http_code}" "$FRONTEND_URL")"
[[ "$INDEX_CODE" == "200" ]] || fail "frontend index вернул HTTP $INDEX_CODE"
grep -qi '<title>' "$INDEX_FILE" || fail "index не содержит <title>"

echo "[smoke] Проверка frontend login page: $FRONTEND_URL$LOGIN_PATH"
LOGIN_CODE="$(curl -sS -L -o "$LOGIN_FILE" -w "%{http_code}" "$FRONTEND_URL$LOGIN_PATH")"
[[ "$LOGIN_CODE" == "200" ]] || fail "login page вернула HTTP $LOGIN_CODE"

grep -qi 'diploma\|login\|войти' "$LOGIN_FILE" || fail "login page не содержит ожидаемые маркеры"

echo "[smoke] ✅ Smoke frontend пройден успешно"
