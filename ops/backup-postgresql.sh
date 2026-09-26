#!/usr/bin/env bash
set -euo pipefail
PG_BIN="${PG_BIN:-/usr/local/apps/pgsql18/bin}"
DB_NAME="${LIGHTWORLD_DB_NAME:-lightworld_website_db}"
DB_USER="${LIGHTWORLD_DB_USER:-lightworld_website_user}"
SOCKET_DIR="${LIGHTWORLD_PG_SOCKET_DIR:-/tmp}"
BACKUP_ROOT="${LIGHTWORLD_BACKUP_DIR:-/home/lightworld/shared/lightworldtech/backups}"
BACKUP_DIR="$BACKUP_ROOT/postgresql"
LOG_FILE="/home/lightworld/shared/lightworldtech/ops/postgresql-backup.log"
RETENTION_DAYS="${LIGHTWORLD_BACKUP_RETENTION_DAYS:-14}"
APP_GROUP="lightworld"
umask 027
install -d -o root -g "$APP_GROUP" -m 0750 "$BACKUP_ROOT" "$BACKUP_DIR"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
FINAL="$BACKUP_DIR/${DB_NAME}-$STAMP.dump"
TMP="${FINAL}.partial"
cleanup(){ rm -f "$TMP"; }
trap cleanup EXIT
"$PG_BIN/pg_dump" -h "$SOCKET_DIR" -U "$DB_USER" -d "$DB_NAME" -Fc -f "$TMP"
"$PG_BIN/pg_restore" --list "$TMP" >/dev/null
mv "$TMP" "$FINAL"
chown root:"$APP_GROUP" "$FINAL"
chmod 0640 "$FINAL"
find "$BACKUP_DIR" -maxdepth 1 -type f -name "${DB_NAME}-*.dump" -mtime "+$RETENTION_DAYS" -delete
printf '%s backup=%s size=%s status=ok\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$FINAL" "$(stat -c %s "$FINAL")" >> "$LOG_FILE"
echo "$FINAL"
