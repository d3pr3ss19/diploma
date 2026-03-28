#!/usr/bin/env bash

if [[ -n "${__TEMP_POSTGRES_SH:-}" ]]; then
  return 0
fi
__TEMP_POSTGRES_SH=1

temp_pg_fail() {
  if declare -F fail >/dev/null 2>&1; then
    fail "$1"
  fi

  echo "[temp-postgres] ❌ $1" >&2
  exit 1
}

temp_pg_pick_free_port() {
  python3 - <<'PY'
import socket
with socket.socket() as sock:
    sock.bind(('127.0.0.1', 0))
    print(sock.getsockname()[1])
PY
}

temp_pg_wait_for_postgres() {
  local attempt
  for attempt in $(seq 1 30); do
    if "$TEMP_PG_CONTAINER_RUNTIME" exec "$TEMP_PG_CONTAINER_ID" pg_isready -U "$TEMP_PG_DB_USER" -d "$TEMP_PG_DB_NAME" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done
  return 1
}

temp_pg_setup() {
  TEMP_PG_LABEL="${TEMP_PG_LABEL:-temp-postgres}"
  TEMP_PG_DB_NAME="${TEMP_PG_DB_NAME:?TEMP_PG_DB_NAME is required}"
  TEMP_PG_DB_USER="${TEMP_PG_DB_USER:-postgres}"
  TEMP_PG_DB_PASSWORD="${TEMP_PG_DB_PASSWORD:-postgres}"
  TEMP_PG_DB_IMAGE="${TEMP_PG_DB_IMAGE:-postgres:16-alpine}"
  TEMP_PG_DB_PORT="${TEMP_PG_DB_PORT:-}"
  TEMP_PG_DATABASE_URL="${TEMP_PG_DATABASE_URL:-${TEST_DATABASE_URL:-}}"
  TEMP_PG_CONTAINER_ID="${TEMP_PG_CONTAINER_ID:-}"
  TEMP_PG_CONTAINER_RUNTIME="${TEMP_PG_CONTAINER_RUNTIME:-}"

  if [[ -n "$TEMP_PG_DATABASE_URL" ]]; then
    echo "[$TEMP_PG_LABEL] ✅ Using TEST_DATABASE_URL from environment"
    return 0
  fi

  if command -v docker >/dev/null 2>&1; then
    TEMP_PG_CONTAINER_RUNTIME="docker"
  elif command -v podman >/dev/null 2>&1; then
    TEMP_PG_CONTAINER_RUNTIME="podman"
  else
    temp_pg_fail "Нужен docker/podman или TEST_DATABASE_URL"
  fi

  if [[ -z "$TEMP_PG_DB_PORT" ]]; then
    TEMP_PG_DB_PORT="$(temp_pg_pick_free_port)"
  fi

  TEMP_PG_CONTAINER_ID="$($TEMP_PG_CONTAINER_RUNTIME run -d \
    -e POSTGRES_DB="$TEMP_PG_DB_NAME" \
    -e POSTGRES_USER="$TEMP_PG_DB_USER" \
    -e POSTGRES_PASSWORD="$TEMP_PG_DB_PASSWORD" \
    -p "127.0.0.1:${TEMP_PG_DB_PORT}:5432" \
    "$TEMP_PG_DB_IMAGE")"

  temp_pg_wait_for_postgres || temp_pg_fail "Postgres в контейнере не стал готовым вовремя"
  TEMP_PG_DATABASE_URL="postgresql://${TEMP_PG_DB_USER}:${TEMP_PG_DB_PASSWORD}@127.0.0.1:${TEMP_PG_DB_PORT}/${TEMP_PG_DB_NAME}?schema=public"
  echo "[$TEMP_PG_LABEL] ✅ Started temporary Postgres via $TEMP_PG_CONTAINER_RUNTIME on port $TEMP_PG_DB_PORT"
}

temp_pg_cleanup() {
  if [[ -n "${TEMP_PG_CONTAINER_ID:-}" && -n "${TEMP_PG_CONTAINER_RUNTIME:-}" ]]; then
    "$TEMP_PG_CONTAINER_RUNTIME" rm -f "$TEMP_PG_CONTAINER_ID" >/dev/null 2>&1 || true
  fi
}

temp_pg_exec_psql() {
  local sql="$1"
  [[ -n "${TEMP_PG_CONTAINER_ID:-}" ]] || temp_pg_fail "SQL-проверки поддерживаются только для временной БД контейнера"
  "$TEMP_PG_CONTAINER_RUNTIME" exec "$TEMP_PG_CONTAINER_ID" psql "$TEMP_PG_DATABASE_URL" -tAc "$sql"
}
