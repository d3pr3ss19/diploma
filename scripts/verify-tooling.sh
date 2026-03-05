#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

fail() {
  echo "[verify-tooling] ❌ $1" >&2
  exit 1
}

command -v make >/dev/null 2>&1 || fail "Требуется make"

./scripts/verify-scripts.sh

# Dry-run Make targets to ensure commands are wired correctly.
for target in smoke smoke-full smoke-backend smoke-frontend e2e-api e2e-rbac verify-scripts test-frontend; do
  make -n "$target" >/dev/null
  echo "[verify-tooling] ✅ make -n $target"
done

echo "[verify-tooling] 🎉 Tooling-проверки пройдены"
