#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

python - <<'PY'
import json
from pathlib import Path

json_files = [
    Path('backend/package.json'),
    Path('backend/tsconfig.json'),
    Path('backend/tsconfig.build.json'),
    Path('frontend/package.json'),
    Path('frontend/tsconfig.json'),
]

required_files = [
    Path('backend/prisma/schema.prisma'),
    Path('backend/prisma/migrations/migration_lock.toml'),
]

for file in json_files:
    if not file.exists():
        raise SystemExit(f"[verify-configs] ❌ Missing file: {file}")
    with file.open('r', encoding='utf-8') as f:
        json.load(f)
    print(f"[verify-configs] ✅ JSON config valid: {file}")

for file in required_files:
    if not file.exists():
        raise SystemExit(f"[verify-configs] ❌ Missing required config artifact: {file}")
    print(f"[verify-configs] ✅ Required config artifact found: {file}")

migration_files = sorted(Path('backend/prisma/migrations').glob('*/migration.sql'))
if not migration_files:
    raise SystemExit('[verify-configs] ❌ Missing Prisma migration SQL files')

refresh_session_migrations = [path for path in migration_files if 'refresh_sessions' in path.read_text(encoding='utf-8')]
if not refresh_session_migrations:
    raise SystemExit('[verify-configs] ❌ No Prisma migration creates refresh_sessions for auth model')

for file in migration_files:
    print(f"[verify-configs] ✅ Prisma migration found: {file}")

print('[verify-configs] 🎉 JSON-конфиги и Prisma migration-артефакты валидны')
PY
