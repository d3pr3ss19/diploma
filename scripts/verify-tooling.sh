#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

fail() {
  echo "[verify-tooling] ❌ $1" >&2
  exit 1
}

command -v make >/dev/null 2>&1 || fail "Требуется make"

scripts=(
  scripts/wait-for-http.sh
  scripts/smoke-backend.sh
  scripts/smoke-frontend.sh
  scripts/e2e-api-auth-flow.sh
  scripts/e2e-api-rbac.sh
  scripts/smoke-all.sh
  scripts/verify-scripts.sh
  scripts/verify-tooling.sh
  scripts/verify-structure.sh
)

for script in "${scripts[@]}"; do
  [[ -f "$script" ]] || fail "Не найден скрипт: $script"
  [[ -x "$script" ]] || fail "Скрипт не исполняемый: $script"
  echo "[verify-tooling] ✅ executable: $script"
done

./scripts/verify-scripts.sh
./scripts/verify-structure.sh

# Dry-run Make targets to ensure commands are wired correctly.
for target in smoke smoke-full smoke-backend smoke-frontend e2e-api e2e-rbac verify-scripts verify-structure verify-tooling test-frontend; do
  make -n "$target" >/dev/null
  echo "[verify-tooling] ✅ make -n $target"
done

echo "[verify-tooling] 🎉 Tooling-проверки пройдены"
