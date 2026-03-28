#!/usr/bin/env bash

if [[ -n "${__BACKEND_RUNTIME_SH:-}" ]]; then
  return 0
fi
__BACKEND_RUNTIME_SH=1

backend_runtime_fail() {
  if declare -F fail >/dev/null 2>&1; then
    fail "$1"
  fi

  echo "[backend-runtime] ❌ $1" >&2
  exit 1
}

backend_runtime_ensure_alive() {
  if [[ -n "${BACKEND_RUNTIME_PID:-}" ]] && ! kill -0 "$BACKEND_RUNTIME_PID" >/dev/null 2>&1; then
    echo "[${BACKEND_RUNTIME_LABEL:-backend-runtime}] --- backend log ---" >&2
    cat "${BACKEND_RUNTIME_LOG_FILE:-/dev/null}" >&2 || true
    backend_runtime_fail "Backend завершился раньше времени"
  fi
}

backend_runtime_start() {
  BACKEND_RUNTIME_LABEL="${BACKEND_RUNTIME_LABEL:-backend-runtime}"
  BACKEND_RUNTIME_DIR="${BACKEND_RUNTIME_DIR:?BACKEND_RUNTIME_DIR is required}"
  BACKEND_RUNTIME_DATABASE_URL="${BACKEND_RUNTIME_DATABASE_URL:?BACKEND_RUNTIME_DATABASE_URL is required}"
  BACKEND_RUNTIME_PORT="${BACKEND_RUNTIME_PORT:-3000}"
  BACKEND_RUNTIME_AUTH_JWT_SECRET="${BACKEND_RUNTIME_AUTH_JWT_SECRET:-backend-runtime-secret}"
  BACKEND_RUNTIME_LOG_FILE="${BACKEND_RUNTIME_LOG_FILE:?BACKEND_RUNTIME_LOG_FILE is required}"
  BACKEND_RUNTIME_WAIT_SCRIPT="${BACKEND_RUNTIME_WAIT_SCRIPT:?BACKEND_RUNTIME_WAIT_SCRIPT is required}"
  BACKEND_RUNTIME_WAIT_TIMEOUT="${BACKEND_RUNTIME_WAIT_TIMEOUT:-60}"
  BACKEND_RUNTIME_WAIT_INTERVAL="${BACKEND_RUNTIME_WAIT_INTERVAL:-1}"
  BACKEND_RUNTIME_BASE_URL="${BACKEND_RUNTIME_BASE_URL:-http://127.0.0.1:${BACKEND_RUNTIME_PORT}/api/v1}"

  echo "[$BACKEND_RUNTIME_LABEL] ▶ start backend"
  (
    cd "$BACKEND_RUNTIME_DIR"
    DATABASE_URL="$BACKEND_RUNTIME_DATABASE_URL" \
    PORT="$BACKEND_RUNTIME_PORT" \
    AUTH_JWT_SECRET="$BACKEND_RUNTIME_AUTH_JWT_SECRET" \
    npm exec -- ts-node --transpile-only src/main.ts
  ) >"$BACKEND_RUNTIME_LOG_FILE" 2>&1 &
  BACKEND_RUNTIME_PID=$!

  "$BACKEND_RUNTIME_WAIT_SCRIPT" "$BACKEND_RUNTIME_BASE_URL/health" "$BACKEND_RUNTIME_WAIT_TIMEOUT" "$BACKEND_RUNTIME_WAIT_INTERVAL" || {
    echo "[$BACKEND_RUNTIME_LABEL] --- backend log ---" >&2
    cat "$BACKEND_RUNTIME_LOG_FILE" >&2 || true
    backend_runtime_fail "Backend не поднялся вовремя"
  }

  backend_runtime_ensure_alive
  echo "[$BACKEND_RUNTIME_LABEL] ✅ backend started on $BACKEND_RUNTIME_BASE_URL"
}

backend_runtime_stop() {
  if [[ -n "${BACKEND_RUNTIME_PID:-}" ]]; then
    kill "$BACKEND_RUNTIME_PID" >/dev/null 2>&1 || true
    wait "$BACKEND_RUNTIME_PID" >/dev/null 2>&1 || true
  fi
}
