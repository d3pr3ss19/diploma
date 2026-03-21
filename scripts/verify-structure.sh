#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

required_paths=(
  Makefile
  README.md
  docs/api-mvp.md
  docs/er-model.md
  docs/progress.md
  docs/smoke-checklist.md
  backend/package.json
  backend/prisma/schema.prisma
  backend/src/main.ts
  backend/src/app.module.ts
  frontend/package.json
  frontend/src/main.tsx
  frontend/src/router/AppRouter.tsx
  scripts/smoke-backend.sh
  scripts/smoke-frontend.sh
  scripts/smoke-all.sh
  scripts/e2e-api-auth-flow.sh
  scripts/e2e-api-rbac.sh
  scripts/e2e-api-auth-integration.sh
  scripts/ci-auth-check.sh
  scripts/ci-prepare-auth-db.sh
  scripts/verify-scripts.sh
  scripts/verify-tooling.sh
  scripts/verify-token-helper.sh
  scripts/verify-wait-for-http.sh
  scripts/verify-prisma-migrate.sh
  scripts/verify-prisma-redeploy.sh
  scripts/verify-auth-seed.sh
  scripts/verify-auth-seed-scope.sh
  scripts/verify-auth-seed-after-runtime.sh
  scripts/verify-auth-runtime.sh
  scripts/verify-auth-runtime-domain-safety.sh
  scripts/verify-auth-external-db-url.sh
  scripts/verify-auth-no-seed.sh
  scripts/lib/temp-postgres.sh
  scripts/lib/backend-runtime.sh
  scripts/extract-access-token.py
)

for path in "${required_paths[@]}"; do
  if [[ ! -e "$path" ]]; then
    echo "[verify-structure] ❌ Missing required path: $path" >&2
    exit 1
  fi
  echo "[verify-structure] ✅ $path"
done

echo "[verify-structure] 🎉 Структура проекта валидна"
