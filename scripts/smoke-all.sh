#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUN_E2E="${RUN_E2E:-0}"

run_step() {
  local title="$1"
  shift
  echo "[smoke-all] ▶ $title"
  "$@"
  echo "[smoke-all] ✅ $title"
}

run_step "Backend smoke" "$ROOT_DIR/scripts/smoke-backend.sh"
run_step "Frontend smoke" "$ROOT_DIR/scripts/smoke-frontend.sh"

if [[ "$RUN_E2E" == "1" ]]; then
  run_step "API auth e2e" "$ROOT_DIR/scripts/e2e-api-auth-flow.sh"
  run_step "API RBAC e2e" "$ROOT_DIR/scripts/e2e-api-rbac.sh"
fi

echo "[smoke-all] 🎉 Все smoke-проверки прошли успешно"
