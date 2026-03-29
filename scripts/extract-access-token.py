#!/usr/bin/env python3
"""Extract accessToken from JSON response payload."""

import json
import sys
from pathlib import Path


def main() -> int:
  if len(sys.argv) != 2:
    print('usage: extract-access-token.py <json_file>', file=sys.stderr)
    return 2

  payload_path = Path(sys.argv[1])
  try:
    payload = json.loads(payload_path.read_text(encoding='utf-8'))
  except (OSError, json.JSONDecodeError) as error:
    print(f'failed to read json payload: {error}', file=sys.stderr)
    return 1

  token = payload.get('accessToken')
  if not isinstance(token, str) or not token:
    print('missing non-empty string field "accessToken"', file=sys.stderr)
    return 1

  print(token)
  return 0


if __name__ == '__main__':
  raise SystemExit(main())
