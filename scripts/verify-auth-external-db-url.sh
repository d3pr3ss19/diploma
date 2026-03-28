#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=./lib/temp-postgres.sh
source "$ROOT_DIR/scripts/lib/temp-postgres.sh"

fail() {
  echo "[verify-auth-external-db] ❌ $1" >&2
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "Требуется команда '$1'"
}

cleanup() {
  temp_pg_cleanup
}

trap cleanup EXIT

require_cmd bash
require_cmd npm
require_cmd python3

run_with_external_db() {
  local title="$1"
  local db_name="$2"
  shift 2

  TEMP_PG_LABEL="verify-auth-external-db"
  TEMP_PG_DB_NAME="$db_name"
  TEMP_PG_DB_USER="${VERIFY_AUTH_EXTERNAL_DB_USER:-postgres}"
  TEMP_PG_DB_PASSWORD="${VERIFY_AUTH_EXTERNAL_DB_PASSWORD:-postgres}"
  TEMP_PG_DB_IMAGE="${VERIFY_AUTH_EXTERNAL_DB_IMAGE:-postgres:16-alpine}"
  TEMP_PG_DB_PORT=""
  TEMP_PG_DATABASE_URL=""
  TEMP_PG_CONTAINER_ID=""
  TEMP_PG_CONTAINER_RUNTIME=""

  temp_pg_setup

  echo "[verify-auth-external-db] ▶ $title via TEST_DATABASE_URL"
  TEST_DATABASE_URL="$TEMP_PG_DATABASE_URL" "$@"
  echo "[verify-auth-external-db] ✅ $title via TEST_DATABASE_URL"

  temp_pg_cleanup
  TEMP_PG_CONTAINER_ID=""
  TEMP_PG_CONTAINER_RUNTIME=""
  TEMP_PG_DATABASE_URL=""
}

run_with_external_db \
  "verify-auth-runtime" \
  "${VERIFY_AUTH_EXTERNAL_RUNTIME_DB_NAME:-diploma_verify_runtime_external}" \
  env VERIFY_AUTH_RUNTIME_PORT="${VERIFY_AUTH_EXTERNAL_RUNTIME_PORT:-3500}" "$ROOT_DIR/scripts/verify-auth-runtime.sh"

run_with_external_db \
  "verify-auth-runtime-domain-safety" \
  "${VERIFY_AUTH_EXTERNAL_DOMAIN_DB_NAME:-diploma_verify_runtime_domain_external}" \
  env VERIFY_AUTH_RUNTIME_DOMAIN_PORT="${VERIFY_AUTH_EXTERNAL_DOMAIN_PORT:-3501}" "$ROOT_DIR/scripts/verify-auth-runtime-domain-safety.sh"

echo "[verify-auth-external-db] 🎉 External TEST_DATABASE_URL mode checks passed"
