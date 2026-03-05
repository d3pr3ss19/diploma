#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

python - <<'PY'
import json
from pathlib import Path

files = [
    Path('backend/package.json'),
    Path('backend/tsconfig.json'),
    Path('backend/tsconfig.build.json'),
    Path('frontend/package.json'),
    Path('frontend/tsconfig.json'),
]

for file in files:
    if not file.exists():
        raise SystemExit(f"[verify-configs] ❌ Missing file: {file}")
    with file.open('r', encoding='utf-8') as f:
        json.load(f)
    print(f"[verify-configs] ✅ {file}")

print('[verify-configs] 🎉 JSON-конфиги валидны')
PY
