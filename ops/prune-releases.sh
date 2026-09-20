#!/usr/bin/env bash
set -euo pipefail

ROOT="/home/lightworld/releases"
PREFIX="lightworldtech-"
CURRENT_LINK="/home/lightworld/webapps/lightworldtech"
ROLLBACK_LINK="/home/lightworld/webapps/lightworldtech-previous"
MIN_AGE_SECONDS=3600
LOG="/home/lightworld/shared/lightworldtech/ops/prune-releases.log"
LOCK_FILE="/home/lightworld/shared/lightworldtech/ops/promote-release.lock"

exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  printf '[%s] release prune skipped; promotion lock is held\n' "$(date -Is)" >> "$LOG"
  exit 0
fi

resolve_link() {
  local link="$1"
  if [ -L "$link" ]; then
    readlink -f "$link" 2>/dev/null || true
  fi
}

in_use_by_process() {
  local dir="$1"
  local proc cwd

  for proc in /proc/[0-9]*; do
    cwd="$(readlink -f "$proc/cwd" 2>/dev/null || true)"
    case "$cwd" in
      "$dir"|"$dir"/*) return 0 ;;
    esac
  done

  return 1
}

current="$(resolve_link "$CURRENT_LINK")"
rollback="$(resolve_link "$ROLLBACK_LINK")"
now="$(date +%s)"

mapfile -t releases < <(
  find "$ROOT" -maxdepth 1 -mindepth 1 -type d -name "${PREFIX}*" -printf "%T@ %p\n" 2>/dev/null |
    sort -nr |
    awk '{print $2}'
)

{
  printf '[%s] release prune start; found=%s current=%s rollback=%s\n'     "$(date -Is)" "${#releases[@]}" "${current:-none}" "${rollback:-none}"

  for dir in "${releases[@]}"; do
    if [ "$dir" = "$current" ]; then
      printf 'KEEP_CURRENT %s\n' "$dir"
      continue
    fi

    if [ -n "$rollback" ] && [ "$dir" = "$rollback" ]; then
      printf 'KEEP_ROLLBACK %s\n' "$dir"
      continue
    fi

    if in_use_by_process "$dir"; then
      printf 'KEEP_IN_USE %s\n' "$dir"
      continue
    fi

    mtime="$(stat -c %Y "$dir" 2>/dev/null || echo "$now")"
    age=$((now - mtime))
    if [ "$age" -lt "$MIN_AGE_SECONDS" ]; then
      printf 'KEEP_RECENT age=%ss %s\n' "$age" "$dir"
      continue
    fi

    case "$dir" in
      "$ROOT"/"$PREFIX"*)
        printf 'DELETE age=%ss %s\n' "$age" "$dir"
        rm -rf --one-file-system -- "$dir"
        ;;
      *)
        printf 'SKIP_UNEXPECTED_PATH %s\n' "$dir"
        ;;
    esac
  done

  printf '[%s] release prune complete\n' "$(date -Is)"
} >> "$LOG" 2>&1
