#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

fail() {
  echo "[ci-auth] ❌ $1" >&2
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "Требуется команда '$1'"
}

require_cmd bash
require_cmd curl
require_cmd python3

# Mandatory envs for CI DB-backed auth checks.
: "${BASE_URL:?BASE_URL is required, e.g. http://localhost:3000/api/v1}"
: "${E2E_OPERATOR_EMAIL:?E2E_OPERATOR_EMAIL is required}"
: "${E2E_OPERATOR_PASSWORD:?E2E_OPERATOR_PASSWORD is required}"
: "${E2E_SUBSCRIBER_EMAIL:?E2E_SUBSCRIBER_EMAIL is required}"
: "${E2E_SUBSCRIBER_PASSWORD:?E2E_SUBSCRIBER_PASSWORD is required}"

if [[ "${PREPARE_DB:-0}" == "1" ]]; then
  : "${DATABASE_URL:?DATABASE_URL is required when PREPARE_DB=1}"
fi

WAIT_TIMEOUT="${WAIT_TIMEOUT:-60}"
WAIT_INTERVAL="${WAIT_INTERVAL:-2}"
PREPARE_DB="${PREPARE_DB:-0}"

run_step() {
  local title="$1"
  shift
  echo "[ci-auth] ▶ $title"
  "$@"
  echo "[ci-auth] ✅ $title"
}

if [[ "$PREPARE_DB" == "1" ]]; then
  run_step "prepare db (migrate + seed)" "$ROOT_DIR/scripts/ci-prepare-auth-db.sh"
fi

run_step "wait backend health" "$ROOT_DIR/scripts/wait-for-http.sh" "$BASE_URL/health" "$WAIT_TIMEOUT" "$WAIT_INTERVAL"
run_step "smoke backend" "$ROOT_DIR/scripts/smoke-backend.sh"
run_step "e2e auth-flow" "$ROOT_DIR/scripts/e2e-api-auth-flow.sh"
run_step "e2e rbac" "$ROOT_DIR/scripts/e2e-api-rbac.sh"
run_step "e2e auth integration" "$ROOT_DIR/scripts/e2e-api-auth-integration.sh"

echo "[ci-auth] 🎉 CI auth-check completed"
