#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

run_step() {
  local title="$1"
  shift
  echo "[smoke-all] ▶ $title"
  "$@"
  echo "[smoke-all] ✅ $title"
}

run_step "Backend smoke" "$ROOT_DIR/scripts/smoke-backend.sh"
run_step "Frontend smoke" "$ROOT_DIR/scripts/smoke-frontend.sh"

echo "[smoke-all] 🎉 Все smoke-проверки прошли успешно"
