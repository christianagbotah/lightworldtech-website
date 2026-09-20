#!/usr/bin/env bash
set -euo pipefail

SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_DIR="/home/lightworld/shared/lightworldtech/ops"
APP_GROUP="lightworld"

[ "$(id -u)" -eq 0 ] || {
  echo "Run this installer as root." >&2
  exit 77
}

install -d -o root -g "$APP_GROUP" -m 0750 "$TARGET_DIR"

for script in prepare-release-runtime.sh promote-release.sh prune-releases.sh; do
  bash -n "$SOURCE_DIR/$script"
  install -o root -g "$APP_GROUP" -m 0700 "$SOURCE_DIR/$script" "$TARGET_DIR/$script"
done

echo "Installed production operations scripts into $TARGET_DIR"
