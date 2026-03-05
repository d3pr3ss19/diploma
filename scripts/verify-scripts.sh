#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$ROOT_DIR"

scripts=(
  scripts/wait-for-http.sh
  scripts/smoke-backend.sh
  scripts/smoke-frontend.sh
  scripts/e2e-api-auth-flow.sh
  scripts/e2e-api-rbac.sh
  scripts/smoke-all.sh
)

for script in "${scripts[@]}"; do
  if [[ ! -f "$script" ]]; then
    echo "[verify-scripts] ❌ Не найден: $script" >&2
    exit 1
  fi

  bash -n "$script"
  echo "[verify-scripts] ✅ $script"
done

echo "[verify-scripts] 🎉 Все shell-скрипты прошли синтаксическую проверку"
