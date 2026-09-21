#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${LIGHTWORLD_APP_DIR:-/home/lightworld/webapps/lightworldtech}"
PORT="${LIGHTWORLD_PORT:-3007}"

cd "$APP_DIR"

SECRET="$(bun -e 'process.stdout.write(process.env.SMS_CRON_SECRET || "")')"
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
