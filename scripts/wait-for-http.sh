#!/usr/bin/env bash
set -euo pipefail

URL="${1:-}"
TIMEOUT_SEC="${2:-30}"
INTERVAL_SEC="${3:-1}"

if [[ -z "$URL" ]]; then
  echo "Usage: $0 <url> [timeout_sec] [interval_sec]" >&2
  exit 2
fi

command -v curl >/dev/null 2>&1 || {
  echo "[wait] ❌ Требуется curl" >&2
  exit 2
}

started_at="$(date +%s)"

while true; do
  if curl -sS -o /dev/null "$URL"; then
    echo "[wait] ✅ Доступно: $URL"
    exit 0
  fi

  now="$(date +%s)"
  elapsed=$(( now - started_at ))
  if (( elapsed >= TIMEOUT_SEC )); then
    echo "[wait] ❌ Таймаут ожидания $URL (${TIMEOUT_SEC}s)" >&2
    exit 1
  fi

  sleep "$INTERVAL_SEC"
done
