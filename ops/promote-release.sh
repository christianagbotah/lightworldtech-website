#!/usr/bin/env bash
set -euo pipefail

NEW_RELEASE="${1:-}"
RELEASE_ROOT="/home/lightworld/releases"
CURRENT_LINK="/home/lightworld/webapps/lightworldtech"
PREVIOUS_LINK="/home/lightworld/webapps/lightworldtech-previous"
OPS="/home/lightworld/shared/lightworldtech/ops"
APP_USER="lightworldtechapp"
SERVICE_NAME="lightworldtech-app.service"
PORT=3007
CANDIDATE_PORT=3017
LOCK_FILE="$OPS/promote-release.lock"
CANDIDATE_LOG="/tmp/lightworldtech-candidate-$$.log"

fail() {
  echo "ERROR: $*" >&2
  return 1
}

exec 9>"$LOCK_FILE"
flock -n 9 || fail "Another Lightworld promotion is already in progress"

[ -n "$NEW_RELEASE" ] || fail "Usage: $0 /home/lightworld/releases/lightworldtech-<sha>-<timestamp>"

case "$NEW_RELEASE" in
  "$RELEASE_ROOT"/lightworldtech-*) ;;
  *) fail "Release path must be a Lightworld release under $RELEASE_ROOT" ;;
esac

NEW_RELEASE="$(readlink -f "$NEW_RELEASE")"
[ -d "$NEW_RELEASE" ] || fail "Release directory does not exist: $NEW_RELEASE"
[ -f "$NEW_RELEASE/.next/standalone/server.js" ] || fail "Standalone server is missing"
[ -f "$NEW_RELEASE/.next/standalone/RELEASE_SHA" ] || fail "RELEASE_SHA is missing"

"$OPS/prepare-release-runtime.sh" "$NEW_RELEASE" >/dev/null

CURRENT=""
if [ -L "$CURRENT_LINK" ]; then
  CURRENT="$(readlink -f "$CURRENT_LINK" || true)"
fi

if [ "$CURRENT" = "$NEW_RELEASE" ]; then
  echo "already_live=$NEW_RELEASE"
  exit 0
fi

if [ -n "$CURRENT" ]; then
  [ -f "$CURRENT/.next/standalone/server.js" ] || fail "Current rollback release is invalid: $CURRENT"
fi

wait_for_ready() {
  local port="$1"
  local attempts="${2:-30}"
  local code=""
  local attempt

  for ((attempt = 1; attempt <= attempts; attempt++)); do
    code="$(curl -sS --max-time 2 -o /dev/null -w '%{http_code}' "http://127.0.0.1:$port/" 2>/dev/null || true)"
    if [ "$code" = "200" ]; then
      return 0
    fi
    sleep 1
  done

  fail "Server on port $port did not become ready after ${attempts}s"
}

smoke_routes() {
  local port="$1"
  local route code

  for route in \
    / \
    /admin \
    /client \
    /services \
    /services/web-development \
    /services/software-development \
    /services/it-training \
    /portfolio \
    /blog \
    /contact \
    /sitemap.xml
  do
    code="$(curl -sS --max-time 15 -o /dev/null -w '%{http_code}' "http://127.0.0.1:$port$route")"
    [ "$code" = "200" ] || fail "Smoke check failed for $route on port $port: HTTP $code"
  done

  for route in /api/services /api/portfolio; do
    code="$(curl -sS --max-time 15 -o /dev/null -w '%{http_code}' "http://127.0.0.1:$port$route")"
    [ "$code" = "200" ] || fail "Database-backed smoke check failed for $route on port $port: HTTP $code"
  done

  code="$(curl -sS --max-time 15 -o /dev/null -w '%{http_code}' "http://127.0.0.1:$port/api/admin/auth")"
  [ "$code" = "401" ] || fail "Admin unauthenticated auth check on port $port returned HTTP $code"

  code="$(curl -sS --max-time 15 -o /dev/null -w '%{http_code}' "http://127.0.0.1:$port/api/client/auth")"
  [ "$code" = "401" ] || fail "Client unauthenticated auth check on port $port returned HTTP $code"

  code="$(curl -sS --max-time 15 -X POST -o /dev/null -w '%{http_code}' "http://127.0.0.1:$port/api/upload")"
  [ "$code" = "401" ] || fail "Unauthenticated upload check on port $port returned HTTP $code"
}

candidate_pid=""
live_touched=0

cleanup_candidate() {
  if [ -n "$candidate_pid" ]; then
    kill "$candidate_pid" >/dev/null 2>&1 || true
    for _ in $(seq 1 10); do
      kill -0 "$candidate_pid" >/dev/null 2>&1 || break
      sleep 0.2
    done
    kill -9 "$candidate_pid" >/dev/null 2>&1 || true
    candidate_pid=""
  fi
  rm -f "$CANDIDATE_LOG"
}

rollback() {
  local rc=$?
  echo "PROMOTION_FAILED: preserving/restoring verified live release" >&2
  cleanup_candidate

  if [ "$live_touched" -eq 1 ] && [ -n "$CURRENT" ] && [ -f "$CURRENT/.next/standalone/server.js" ]; then
    ln -sfn "$CURRENT" "$CURRENT_LINK" || true
    systemctl restart "$SERVICE_NAME" || true
    wait_for_ready "$PORT" 30 || true
  fi

  exit "$rc"
}

trap rollback ERR INT TERM

# Prove the release under the same Linux identity as production before touching port 3007.
install -o "$APP_USER" -g "$APP_USER" -m 0600 /dev/null "$CANDIDATE_LOG"
candidate_pid="$(
  runuser -u "$APP_USER" -- sh -c "
    cd '$NEW_RELEASE/.next/standalone'
    PORT=$CANDIDATE_PORT HOSTNAME=127.0.0.1 NODE_ENV=production \
      nohup /usr/bin/node server.js >>'$CANDIDATE_LOG' 2>&1 &
    echo \$!
  "
)"
[ -n "$candidate_pid" ] || fail "Candidate process did not start"
wait_for_ready "$CANDIDATE_PORT" 30
smoke_routes "$CANDIDATE_PORT"
cleanup_candidate

# Protect the verified current release before moving the live symlink.
if [ -n "$CURRENT" ]; then
  ln -sfn "$CURRENT" "$PREVIOUS_LINK"
fi

live_touched=1
ln -sfn "$NEW_RELEASE" "$CURRENT_LINK"
systemctl restart "$SERVICE_NAME"
wait_for_ready "$PORT" 30
smoke_routes "$PORT"

trap - ERR INT TERM

echo "promoted_release=$NEW_RELEASE"
echo "previous_release=${CURRENT:-none}"
echo "release_sha=$(cat "$NEW_RELEASE/.next/standalone/RELEASE_SHA")"
