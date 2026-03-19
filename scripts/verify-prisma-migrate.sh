#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"

fail() {
  echo "[verify-prisma-migrate] ❌ $1" >&2
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "Требуется команда '$1'"
}

cleanup() {
  if [[ -n "${CONTAINER_ID:-}" && -n "${CONTAINER_RUNTIME:-}" ]]; then
    "$CONTAINER_RUNTIME" rm -f "$CONTAINER_ID" >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT

require_cmd bash
require_cmd npm
require_cmd python3

DB_NAME="${VERIFY_PRISMA_DB_NAME:-diploma_verify}"
DB_USER="${VERIFY_PRISMA_DB_USER:-postgres}"
DB_PASSWORD="${VERIFY_PRISMA_DB_PASSWORD:-postgres}"
DB_IMAGE="${VERIFY_PRISMA_DB_IMAGE:-postgres:16-alpine}"
DB_PORT="${VERIFY_PRISMA_DB_PORT:-}"
TEST_DATABASE_URL="${TEST_DATABASE_URL:-}"

pick_free_port() {
  python3 - <<'PY'
import socket
with socket.socket() as sock:
    sock.bind(('127.0.0.1', 0))
    print(sock.getsockname()[1])
PY
}

wait_for_postgres() {
  local attempt
  for attempt in $(seq 1 30); do
    if "$CONTAINER_RUNTIME" exec "$CONTAINER_ID" pg_isready -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done
  return 1
}

if [[ -z "$TEST_DATABASE_URL" ]]; then
  if command -v docker >/dev/null 2>&1; then
    CONTAINER_RUNTIME="docker"
  elif command -v podman >/dev/null 2>&1; then
    CONTAINER_RUNTIME="podman"
  else
    fail "Нужен docker/podman или TEST_DATABASE_URL для проверки prisma migrate"
  fi

  if [[ -z "$DB_PORT" ]]; then
    DB_PORT="$(pick_free_port)"
  fi

  CONTAINER_ID="$($CONTAINER_RUNTIME run -d \
    -e POSTGRES_DB="$DB_NAME" \
    -e POSTGRES_USER="$DB_USER" \
    -e POSTGRES_PASSWORD="$DB_PASSWORD" \
    -p "127.0.0.1:${DB_PORT}:5432" \
    "$DB_IMAGE")"

  wait_for_postgres || fail "Postgres в контейнере не стал готовым вовремя"
  TEST_DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@127.0.0.1:${DB_PORT}/${DB_NAME}?schema=public"
  echo "[verify-prisma-migrate] ✅ Started temporary Postgres via $CONTAINER_RUNTIME on port $DB_PORT"
else
  echo "[verify-prisma-migrate] ✅ Using TEST_DATABASE_URL from environment"
fi

run_backend_step() {
  local title="$1"
  shift
  echo "[verify-prisma-migrate] ▶ $title"
  (
    cd "$BACKEND_DIR"
    DATABASE_URL="$TEST_DATABASE_URL" "$@"
  )
  echo "[verify-prisma-migrate] ✅ $title"
}

run_backend_step "prisma generate" npm run prisma:generate
run_backend_step "prisma migrate deploy" npm run prisma:migrate:deploy

if [[ -n "${CONTAINER_ID:-}" ]]; then
  "$CONTAINER_RUNTIME" exec "$CONTAINER_ID" psql "$TEST_DATABASE_URL" -tAc "SELECT to_regclass('public.refresh_sessions');" | grep -qx 'refresh_sessions' \
    || fail "После prisma migrate deploy таблица refresh_sessions не найдена"
  echo "[verify-prisma-migrate] ✅ refresh_sessions exists after migrate deploy"
else
  echo "[verify-prisma-migrate] ⚠️ Проверка наличия refresh_sessions пропущена: используется внешняя БД (TEST_DATABASE_URL)"
fi

echo "[verify-prisma-migrate] 🎉 Prisma migrate deploy smoke-check пройден"
