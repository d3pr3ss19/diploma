#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

fail() {
  echo "[verify-wait-for-http] ❌ $1" >&2
  exit 1
}

command -v python3 >/dev/null 2>&1 || fail "Требуется python3"

WAIT_SCRIPT="scripts/wait-for-http.sh"
[[ -x "$WAIT_SCRIPT" ]] || fail "Не найден или не исполняемый скрипт: $WAIT_SCRIPT"

# Usage should fail with exit code 2 when URL is not provided.
if "$WAIT_SCRIPT" >/dev/null 2>&1; then
  fail "ожидался неуспех без обязательного аргумента URL"
else
  code=$?
  [[ "$code" == "2" ]] || fail "ожидался код 2 для usage-ошибки, получен $code"
fi
echo "[verify-wait-for-http] ✅ usage check"

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"; if [[ -n "${SERVER_PID:-}" ]]; then kill "$SERVER_PID" >/dev/null 2>&1 || true; fi' EXIT

PORT="$(python3 - <<'PY'
import socket
s = socket.socket()
s.bind(("127.0.0.1", 0))
print(s.getsockname()[1])
s.close()
PY
)"

python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$TMP_DIR" >/dev/null 2>&1 &
SERVER_PID=$!

sleep 0.2
"$WAIT_SCRIPT" "http://127.0.0.1:${PORT}" 5 1 >/dev/null 2>&1
echo "[verify-wait-for-http] ✅ reachable endpoint check"


if "$WAIT_SCRIPT" "http://127.0.0.1:${PORT}/missing" 2 1 >/dev/null 2>&1; then
  fail "ожидался таймаут для endpoint c HTTP 404"
else
  code=$?
  [[ "$code" == "1" ]] || fail "ожидался код 1 для HTTP 404 timeout, получен $code"
fi
echo "[verify-wait-for-http] ✅ non-2xx/3xx status handling"

if "$WAIT_SCRIPT" "http://127.0.0.1:9" 1 1 >/dev/null 2>&1; then
  fail "ожидался таймаут для недоступного endpoint"
else
  code=$?
  [[ "$code" == "1" ]] || fail "ожидался код 1 для таймаута, получен $code"
fi
echo "[verify-wait-for-http] ✅ timeout check"


if "$WAIT_SCRIPT" "http://127.0.0.1:1" abc 1 >/dev/null 2>&1; then
  fail "ожидалась ошибка валидации timeout_sec"
else
  code=$?
  [[ "$code" == "2" ]] || fail "ожидался код 2 для невалидного timeout_sec, получен $code"
fi
echo "[verify-wait-for-http] ✅ timeout arg validation"

if "$WAIT_SCRIPT" "http://127.0.0.1:1" 1 0 >/dev/null 2>&1; then
  fail "ожидалась ошибка валидации interval_sec"
else
  code=$?
  [[ "$code" == "2" ]] || fail "ожидался код 2 для невалидного interval_sec, получен $code"
fi
echo "[verify-wait-for-http] ✅ interval arg validation"

echo "[verify-wait-for-http] 🎉 Проверки wait-for-http.sh пройдены"
