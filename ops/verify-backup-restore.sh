#!/usr/bin/env bash
set -euo pipefail
PG_BIN="${PG_BIN:-/usr/local/apps/pgsql18/bin}"
BACKUP_ROOT="${LIGHTWORLD_BACKUP_DIR:-/home/lightworld/shared/lightworldtech/backups}"
DB_BACKUP_DIR="$BACKUP_ROOT/postgresql"
UPLOAD_BACKUP_DIR="$BACKUP_ROOT/uploads"
MARKER="$BACKUP_ROOT/restore-verification.json"
LOG_FILE="/home/lightworld/shared/lightworldtech/ops/restore-verification.log"
APP_GROUP="lightworld"
[ "$(id -u)" -eq 0 ] || { echo "Run restore verification as root." >&2; exit 77; }
DB_BACKUP="$(find "$DB_BACKUP_DIR" -maxdepth 1 -type f -name 'lightworld_website_db-*.dump' -printf '%T@ %p\n' | sort -nr | head -1 | cut -d' ' -f2-)"
UPLOAD_BACKUP="$(find "$UPLOAD_BACKUP_DIR" -maxdepth 1 -type f -name 'uploads-*.tar.gz' -printf '%T@ %p\n' | sort -nr | head -1 | cut -d' ' -f2-)"
[ -n "$DB_BACKUP" ] && [ -r "$DB_BACKUP" ] || { echo "No readable PostgreSQL backup found." >&2; exit 2; }
[ -n "$UPLOAD_BACKUP" ] && [ -r "$UPLOAD_BACKUP" ] || { echo "No readable uploads backup found." >&2; exit 3; }
"$PG_BIN/pg_restore" --list "$DB_BACKUP" >/dev/null
tar -tzf "$UPLOAD_BACKUP" >/dev/null
WORK="$(mktemp -d /tmp/lightworld-restore-verify.XXXXXX)"
chown postgres:postgres "$WORK"
chmod 0700 "$WORK"
DATA="$WORK/data"; SOCKET="$WORK/socket"; PORT=55439; STARTED=0
cleanup(){
  if [ "$STARTED" -eq 1 ]; then runuser -u postgres -- "$PG_BIN/pg_ctl" -D "$DATA" -m fast -w stop >/dev/null 2>&1 || true; fi
  rm -rf "$WORK"
}
trap cleanup EXIT
install -d -o postgres -g postgres -m 0700 "$DATA" "$SOCKET"
runuser -u postgres -- "$PG_BIN/initdb" -D "$DATA" --no-locale --encoding=UTF8 --auth=trust >/dev/null
printf "listen_addresses = ''\nport = %s\nunix_socket_directories = '%s'\nfsync = off\nsynchronous_commit = off\nfull_page_writes = off\n" "$PORT" "$SOCKET" >> "$DATA/postgresql.conf"
chown postgres:postgres "$DATA/postgresql.conf"
runuser -u postgres -- "$PG_BIN/pg_ctl" -D "$DATA" -w start >/dev/null
STARTED=1
runuser -u postgres -- "$PG_BIN/createdb" -h "$SOCKET" -p "$PORT" lightworld_restore_verify
runuser -u postgres -- "$PG_BIN/pg_restore" -h "$SOCKET" -p "$PORT" -d lightworld_restore_verify --no-owner --no-privileges --exit-on-error "$DB_BACKUP" >/dev/null
TABLE_COUNT="$(runuser -u postgres -- "$PG_BIN/psql" -h "$SOCKET" -p "$PORT" -d lightworld_restore_verify -Atc "SELECT count(*) FROM pg_tables WHERE schemaname='public';")"
[ "${TABLE_COUNT:-0}" -gt 0 ] || { echo "Restore rehearsal produced no public tables." >&2; exit 4; }
UPLOAD_ENTRIES="$(tar -tzf "$UPLOAD_BACKUP" | wc -l)"
VERIFIED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
DB_NAME="$(basename "$DB_BACKUP")"; UPLOAD_NAME="$(basename "$UPLOAD_BACKUP")"
python3 - "$MARKER" "$VERIFIED_AT" "$DB_NAME" "$UPLOAD_NAME" "$TABLE_COUNT" "$UPLOAD_ENTRIES" <<'PY'
import json, os, sys, tempfile
marker, verified_at, db_name, upload_name, table_count, upload_entries = sys.argv[1:]
payload={"status":"verified","verifiedAt":verified_at,"databaseArtifact":db_name,"uploadsArtifact":upload_name,"publicTableCount":int(table_count),"uploadArchiveEntries":int(upload_entries),"method":"isolated_ephemeral_postgresql_restore"}
directory=os.path.dirname(marker)
fd,temp=tempfile.mkstemp(prefix=".restore-verification-",dir=directory,text=True)
try:
    with os.fdopen(fd,"w",encoding="utf-8") as h:
        json.dump(payload,h,separators=(",",":")); h.write("\n")
    os.replace(temp,marker)
finally:
    if os.path.exists(temp): os.unlink(temp)
PY
chown root:"$APP_GROUP" "$MARKER"; chmod 0640 "$MARKER"
printf '%s status=verified database=%s uploads=%s tables=%s upload_entries=%s\n' "$VERIFIED_AT" "$DB_NAME" "$UPLOAD_NAME" "$TABLE_COUNT" "$UPLOAD_ENTRIES" >> "$LOG_FILE"
echo "Restore verification passed: $TABLE_COUNT public tables; $UPLOAD_ENTRIES upload archive entries."
