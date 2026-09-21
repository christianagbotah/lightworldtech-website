#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${LIGHTWORLD_APP_DIR:-/home/lightworld/webapps/lightworldtech}"
PORT="${LIGHTWORLD_PORT:-3007}"
ENV_FILE="${LIGHTWORLD_ENV_FILE:-/home/lightworld/shared/lightworldtech/.env}"

if [ ! -r "$ENV_FILE" ]; then
  echo "SMS scheduler skipped: environment file is not readable" >&2
  exit 0
fi

SECRET="$(
  python3 - "$ENV_FILE" <<'PY'
import sys
from pathlib import Path

path = Path(sys.argv[1])
value = ""
for raw in path.read_text(encoding="utf-8").splitlines():
    line = raw.strip()
    if not line or line.startswith("#") or "=" not in line:
        continue
    key, item = line.split("=", 1)
    if key.strip() == "SMS_CRON_SECRET":
        value = item.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in {"'", '"'}:
            value = value[1:-1]
        break
sys.stdout.write(value)
PY
)"

if [ -z "$SECRET" ]; then
  echo "SMS scheduler skipped: SMS_CRON_SECRET is not configured" >&2
  exit 0
fi

curl --fail --silent --show-error \
  --max-time 45 \
  --request POST \
  --header "Authorization: Bearer $SECRET" \
  "http://127.0.0.1:${PORT}/api/internal/sms/dispatch" \
  >/dev/null
