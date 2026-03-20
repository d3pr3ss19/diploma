#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"

fail() {
  echo "[verify-auth-seed] ❌ $1" >&2
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

DB_NAME="${VERIFY_AUTH_SEED_DB_NAME:-diploma_verify_seed}"
DB_USER="${VERIFY_AUTH_SEED_DB_USER:-postgres}"
DB_PASSWORD="${VERIFY_AUTH_SEED_DB_PASSWORD:-postgres}"
DB_IMAGE="${VERIFY_AUTH_SEED_DB_IMAGE:-postgres:16-alpine}"
DB_PORT="${VERIFY_AUTH_SEED_DB_PORT:-}"
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
    fail "Нужен docker/podman или TEST_DATABASE_URL для проверки auth seed"
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
  echo "[verify-auth-seed] ✅ Started temporary Postgres via $CONTAINER_RUNTIME on port $DB_PORT"
else
  echo "[verify-auth-seed] ✅ Using TEST_DATABASE_URL from environment"
fi

run_backend_step() {
  local title="$1"
  shift
  echo "[verify-auth-seed] ▶ $title"
  (
    cd "$BACKEND_DIR"
    DATABASE_URL="$TEST_DATABASE_URL" "$@"
  )
  echo "[verify-auth-seed] ✅ $title"
}

run_psql_scalar() {
  local sql="$1"
  [[ -n "${CONTAINER_ID:-}" ]] || fail "Проверки SQL поддерживаются только для временной БД контейнера"
  "$CONTAINER_RUNTIME" exec "$CONTAINER_ID" psql "$TEST_DATABASE_URL" -tAc "$sql"
}

assert_scalar_equals() {
  local sql="$1"
  local expected="$2"
  local actual
  actual="$(run_psql_scalar "$sql" | tr -d '[:space:]')"
  [[ "$actual" == "$expected" ]] || fail "Ожидалось '$expected', получено '$actual' для SQL: $sql"
}

run_backend_step "prisma generate" npm run prisma:generate
run_backend_step "prisma migrate deploy" npm run prisma:migrate:deploy
run_backend_step "seed auth users (pass 1)" npm run seed:auth-users
run_backend_step "seed auth users (pass 2)" npm run seed:auth-users

if [[ -n "${CONTAINER_ID:-}" ]]; then
  assert_scalar_equals "SELECT COUNT(*) FROM roles;" "3"
  echo "[verify-auth-seed] ✅ roles count is 3"

  assert_scalar_equals "SELECT COUNT(*) FROM users;" "3"
  echo "[verify-auth-seed] ✅ users count is 3"

  assert_scalar_equals "SELECT COUNT(*) FROM users WHERE email IN ('admin@kp.local', 'operator@kp.local', 'subscriber@kp.local');" "3"
  echo "[verify-auth-seed] ✅ seeded auth emails exist"

  assert_scalar_equals "SELECT COUNT(*) FROM roles WHERE code IN ('ADMIN', 'OPERATOR', 'SUBSCRIBER');" "3"
  echo "[verify-auth-seed] ✅ expected role codes exist"
else
  echo "[verify-auth-seed] ⚠️ SQL-проверки пропущены: используется внешняя БД (TEST_DATABASE_URL)"
fi

echo "[verify-auth-seed] 🎉 Auth seed smoke-check пройден"
