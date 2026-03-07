#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

fail() {
  echo "[verify-tooling] ❌ $1" >&2
  exit 1
}

command -v make >/dev/null 2>&1 || fail "Требуется make"
command -v python3 >/dev/null 2>&1 || fail "Требуется python3"

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
  scripts/verify-configs.sh
  scripts/extract-access-token.py
)

for script in "${scripts[@]}"; do
  [[ -f "$script" ]] || fail "Не найден скрипт: $script"
  [[ -x "$script" ]] || fail "Скрипт не исполняемый: $script"
  echo "[verify-tooling] ✅ executable: $script"
done

./scripts/verify-scripts.sh
./scripts/verify-structure.sh
./scripts/verify-configs.sh


python3 -m py_compile scripts/extract-access-token.py
echo "[verify-tooling] ✅ python syntax: scripts/extract-access-token.py"

# Dry-run Make targets to ensure commands are wired correctly.
for target in smoke smoke-full smoke-backend smoke-frontend e2e-api e2e-rbac verify-scripts verify-structure verify-configs verify-tooling test-frontend; do
  make -n "$target" >/dev/null
  echo "[verify-tooling] ✅ make -n $target"
done

echo "[verify-tooling] 🎉 Tooling-проверки пройдены"
