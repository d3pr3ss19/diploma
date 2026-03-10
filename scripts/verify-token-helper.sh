#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

fail() {
  echo "[verify-token-helper] ❌ $1" >&2
  exit 1
}

command -v python3 >/dev/null 2>&1 || fail "Требуется python3"

HELPER="scripts/extract-access-token.py"
[[ -f "$HELPER" ]] || fail "Не найден helper: $HELPER"

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

VALID_JSON="$TMP_DIR/valid.json"
INVALID_JSON="$TMP_DIR/invalid.json"
MISSING_TOKEN_JSON="$TMP_DIR/missing-token.json"

EMPTY_TOKEN_JSON="$TMP_DIR/empty-token.json"
NON_STRING_TOKEN_JSON="$TMP_DIR/non-string-token.json"

cat > "$VALID_JSON" <<'JSON'
{"accessToken":"demo-OPERATOR-stub-user-id"}
JSON

TOKEN="$(python3 "$HELPER" "$VALID_JSON")" || fail "helper не извлёк токен из валидного JSON"
[[ "$TOKEN" == "demo-OPERATOR-stub-user-id" ]] || fail "helper вернул неожиданный токен: $TOKEN"
echo "[verify-token-helper] ✅ valid payload"

cat > "$INVALID_JSON" <<'JSON'
{"accessToken":
JSON
if python3 "$HELPER" "$INVALID_JSON" >/dev/null 2>&1; then
  fail "helper должен завершаться с ошибкой на невалидном JSON"
fi
echo "[verify-token-helper] ✅ invalid JSON handling"

cat > "$MISSING_TOKEN_JSON" <<'JSON'
{"refreshToken":"demo-refresh-stub-user-id"}
JSON
if python3 "$HELPER" "$MISSING_TOKEN_JSON" >/dev/null 2>&1; then
  fail "helper должен завершаться с ошибкой без accessToken"
fi
echo "[verify-token-helper] ✅ missing token handling"


cat > "$EMPTY_TOKEN_JSON" <<'JSON'
{"accessToken":""}
JSON
if python3 "$HELPER" "$EMPTY_TOKEN_JSON" >/dev/null 2>&1; then
  fail "helper должен завершаться с ошибкой при пустом accessToken"
fi
echo "[verify-token-helper] ✅ empty token handling"

cat > "$NON_STRING_TOKEN_JSON" <<'JSON'
{"accessToken":123}
JSON
if python3 "$HELPER" "$NON_STRING_TOKEN_JSON" >/dev/null 2>&1; then
  fail "helper должен завершаться с ошибкой при нестроковом accessToken"
fi
echo "[verify-token-helper] ✅ non-string token handling"

echo "[verify-token-helper] 🎉 Проверки helper-скрипта пройдены"
