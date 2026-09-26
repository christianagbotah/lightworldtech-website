#!/usr/bin/env bash
set -euo pipefail
SOURCE_DIR="${UPLOAD_DIR:-/home/lightworld/shared/lightworldtech/uploads}"
BACKUP_ROOT="${LIGHTWORLD_BACKUP_DIR:-/home/lightworld/shared/lightworldtech/backups}"
BACKUP_DIR="$BACKUP_ROOT/uploads"
LOG_FILE="/home/lightworld/shared/lightworldtech/ops/uploads-backup.log"
RETENTION_DAYS="${LIGHTWORLD_BACKUP_RETENTION_DAYS:-14}"
APP_GROUP="lightworld"
umask 027
install -d -o lightworld -g "$APP_GROUP" -m 0750 "$SOURCE_DIR"
install -d -o root -g "$APP_GROUP" -m 0750 "$BACKUP_ROOT" "$BACKUP_DIR"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
FINAL="$BACKUP_DIR/uploads-$STAMP.tar.gz"
TMP="${FINAL}.partial"
cleanup(){ rm -f "$TMP"; }
trap cleanup EXIT
tar -C "$SOURCE_DIR" -czf "$TMP" .
tar -tzf "$TMP" >/dev/null
mv "$TMP" "$FINAL"
chown root:"$APP_GROUP" "$FINAL"
chmod 0640 "$FINAL"
find "$BACKUP_DIR" -maxdepth 1 -type f -name 'uploads-*.tar.gz' -mtime "+$RETENTION_DAYS" -delete
printf '%s backup=%s size=%s files=%s status=ok\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$FINAL" "$(stat -c %s "$FINAL")" "$(find "$SOURCE_DIR" -type f | wc -l)" >> "$LOG_FILE"
echo "$FINAL"
