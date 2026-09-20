#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 /home/lightworld/releases/<release>" >&2
  exit 64
fi

APP_USER="lightworld"
APP_GROUP="lightworld"
SHARED="/home/lightworld/shared/lightworldtech"
RELEASE="$(readlink -f "$1")"

case "$RELEASE" in
  /home/lightworld/releases/lightworldtech-*) ;;
  *)
    echo "Refusing unexpected release path: $RELEASE" >&2
    exit 65
    ;;
esac

STANDALONE="$RELEASE/.next/standalone"
test -f "$STANDALONE/server.js"
test -f "$STANDALONE/RELEASE_SHA"

install -d -o "$APP_USER" -g "$APP_GROUP" -m 0750 "$STANDALONE/.next/cache"
install -d -o "$APP_USER" -g "$APP_GROUP" -m 0750 "$SHARED/uploads"
ln -sfn "$SHARED/.env" "$STANDALONE/.env"

runuser -u "$APP_USER" -- test -r "$SHARED/.env"
runuser -u "$APP_USER" -- test -w "$STANDALONE/.next/cache"
runuser -u "$APP_USER" -- test -w "$SHARED/uploads"

echo "Runtime prepared: $RELEASE"
