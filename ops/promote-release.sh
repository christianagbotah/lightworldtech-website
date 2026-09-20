#!/usr/bin/env bash
set -euo pipefail

NEW_RELEASE="${1:-}"
RELEASE_ROOT="/home/lightworld/releases"
CURRENT_LINK="/home/lightworld/webapps/lightworldtech"
PREVIOUS_LINK="/home/lightworld/webapps/lightworldtech-previous"
OPS="/home/lightworld/shared/lightworldtech/ops"
APP_USER="lightworld"
PM2_NAME="lightworldtech"
CANDIDATE_NAME="lightworldtech-candidate"
PORT=3007
CANDIDATE_PORT=3017
LOCK_FILE="$OPS/promote-release.lock"

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

pm2_as_app() {
  sudo -u "$APP_USER" -H sh -lc "cd /; $*"
}

smoke_routes() {
  local port="$1"
  local route code

  for route in / /admin /client /services /portfolio /blog /contact /sitemap.xml; do
    code="$(curl -sS --max-time 15 -o /dev/null -w '%{http_code}' "http://127.0.0.1:$port$route")"
    [ "$code" = "200" ] || fail "Smoke check failed for $route on port $port: HTTP $code"
  done

  code="$(curl -sS --max-time 15 -o /dev/null -w '%{http_code}' "http://127.0.0.1:$port/api/admin/auth")"
  [ "$code" = "401" ] || fail "Admin unauthenticated auth check on port $port returned HTTP $code"

  code="$(curl -sS --max-time 15 -o /dev/null -w '%{http_code}' "http://127.0.0.1:$port/api/client/auth")"
  [ "$code" = "401" ] || fail "Client unauthenticated auth check on port $port returned HTTP $code"

  code="$(curl -sS --max-time 15 -X POST -o /dev/null -w '%{http_code}' "http://127.0.0.1:$port/api/upload")"
  [ "$code" = "401" ] || fail "Unauthenticated upload check on port $port returned HTTP $code"
}

candidate_started=0
live_touched=0

cleanup_candidate() {
  if [ "$candidate_started" -eq 1 ]; then
    pm2_as_app "pm2 delete '$CANDIDATE_NAME' >/dev/null 2>&1 || true"
    candidate_started=0
  fi
}

rollback() {
  local rc=$?
  echo "PROMOTION_FAILED: preserving/restoring verified live release" >&2
  cleanup_candidate

  if [ "$live_touched" -eq 1 ]; then
    pm2_as_app "pm2 delete '$PM2_NAME' >/dev/null 2>&1 || true"

    if [ -n "$CURRENT" ] && [ -f "$CURRENT/.next/standalone/server.js" ]; then
      sudo -u "$APP_USER" -H sh -lc "cd '$CURRENT/.next/standalone' && PORT=$PORT HOSTNAME=127.0.0.1 NODE_ENV=production pm2 start server.js --name '$PM2_NAME' >/dev/null" || true
      ln -sfn "$CURRENT" "$CURRENT_LINK" || true
      pm2_as_app "pm2 save >/dev/null" || true
    fi
  fi

  exit "$rc"
}

trap rollback ERR INT TERM

# Prove the release on an isolated local port before touching live traffic.
pm2_as_app "pm2 delete '$CANDIDATE_NAME' >/dev/null 2>&1 || true"
sudo -u "$APP_USER" -H sh -lc "cd '$NEW_RELEASE/.next/standalone' && PORT=$CANDIDATE_PORT HOSTNAME=127.0.0.1 NODE_ENV=production pm2 start server.js --name '$CANDIDATE_NAME' >/dev/null"
candidate_started=1
sleep 2
smoke_routes "$CANDIDATE_PORT"
cleanup_candidate

# Protect the currently verified live release from pruning before switching.
if [ -n "$CURRENT" ]; then
  ln -sfn "$CURRENT" "$PREVIOUS_LINK"
fi

live_touched=1
pm2_as_app "pm2 delete '$PM2_NAME' >/dev/null 2>&1 || true"
sudo -u "$APP_USER" -H sh -lc "cd '$NEW_RELEASE/.next/standalone' && PORT=$PORT HOSTNAME=127.0.0.1 NODE_ENV=production pm2 start server.js --name '$PM2_NAME' >/dev/null"
ln -sfn "$NEW_RELEASE" "$CURRENT_LINK"
pm2_as_app "pm2 save >/dev/null"

sleep 2
smoke_routes "$PORT"

trap - ERR INT TERM

echo "promoted_release=$NEW_RELEASE"
echo "previous_release=${CURRENT:-none}"
echo "release_sha=$(cat "$NEW_RELEASE/.next/standalone/RELEASE_SHA")"
