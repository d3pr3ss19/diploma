#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$ROOT_DIR"

command -v bash >/dev/null 2>&1 || {
  echo "[verify-scripts] ❌ Требуется bash" >&2
  exit 1
}
command -v python3 >/dev/null 2>&1 || {
  echo "[verify-scripts] ❌ Требуется python3" >&2
  exit 1
}

shell_scripts=(
  scripts/wait-for-http.sh
  scripts/smoke-backend.sh
  scripts/smoke-frontend.sh
  scripts/e2e-api-auth-flow.sh
  scripts/e2e-api-rbac.sh
  scripts/smoke-all.sh
)

for script in "${shell_scripts[@]}"; do
  if [[ ! -f "$script" ]]; then
    echo "[verify-scripts] ❌ Не найден: $script" >&2
    exit 1
  fi

  bash -n "$script"
  echo "[verify-scripts] ✅ shell syntax: $script"
done

python_scripts=(
  scripts/extract-access-token.py
)

for script in "${python_scripts[@]}"; do
  if [[ ! -f "$script" ]]; then
    echo "[verify-scripts] ❌ Не найден: $script" >&2
    exit 1
  fi

  python3 -m py_compile "$script"
  echo "[verify-scripts] ✅ python syntax: $script"
done

echo "[verify-scripts] 🎉 Shell/Python скрипты прошли синтаксическую проверку"
