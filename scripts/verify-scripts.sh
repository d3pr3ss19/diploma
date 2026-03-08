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

shopt -s nullglob

shell_scripts=(scripts/*.sh)
python_scripts=(scripts/*.py)

((${#shell_scripts[@]} > 0)) || {
  echo "[verify-scripts] ❌ Не найдены shell-скрипты в scripts/*.sh" >&2
  exit 1
}

for script in "${shell_scripts[@]}"; do
  [[ -f "$script" ]] || continue
  bash -n "$script"
  echo "[verify-scripts] ✅ shell syntax: $script"
done

((${#python_scripts[@]} > 0)) || {
  echo "[verify-scripts] ❌ Не найдены python-скрипты в scripts/*.py" >&2
  exit 1
}

for script in "${python_scripts[@]}"; do
  [[ -f "$script" ]] || continue
  python3 -m py_compile "$script"
  echo "[verify-scripts] ✅ python syntax: $script"
done

echo "[verify-scripts] 🎉 Shell/Python скрипты прошли синтаксическую проверку"
