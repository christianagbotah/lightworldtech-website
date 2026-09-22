#!/usr/bin/env bash
set -euo pipefail

NEW_RELEASE="${1:-}"
RELEASE_ROOT="/home/lightworld/releases"
CURRENT_LINK="/home/lightworld/webapps/lightworldtech"
PREVIOUS_LINK="/home/lightworld/webapps/lightworldtech-previous"
OPS="/home/lightworld/shared/lightworldtech/ops"
APP_USER="lightworld"
APP_GROUP="lightworld"
LIVE_UNIT="lightworldtech-app.service"
CANDIDATE_UNIT="lightworldtech-candidate.service"
LEGACY_PM2_UNIT="pm2-lightworld.service"
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
systemctl cat "$LIVE_UNIT" >/dev/null 2>&1 || fail "$LIVE_UNIT is not installed"

if systemctl is-active --quiet "$LEGACY_PM2_UNIT"; then
  fail "Legacy supervisor $LEGACY_PM2_UNIT is active. Stop/disable it before promotion to prevent a port 3007 conflict."
fi

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

listener_pid() {
  local port="$1"
  ss -ltnpH "sport = :$port" 2>/dev/null     | sed -n 's/.*pid=\([0-9][0-9]*\).*/\1/p'     | head -n 1
}

verify_live_listener() {
  local listener service_pid
  listener="$(listener_pid "$PORT")"
  service_pid="$(systemctl show -p MainPID --value "$LIVE_UNIT" 2>/dev/null || true)"

  if systemctl is-active --quiet "$LIVE_UNIT"; then
    [ -n "$listener" ] || fail "$LIVE_UNIT is active but nothing is listening on port $PORT"
    [ "$listener" = "$service_pid" ] || fail "Port $PORT is owned by PID $listener, not $LIVE_UNIT PID $service_pid"
  elif [ -n "$listener" ]; then
    fail "Port $PORT is occupied by PID $listener while $LIVE_UNIT is inactive"
  fi
}

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

  for route in / /admin /client /services /services/software-development /services/it-training /portfolio /blog /newsroom /contact /sitemap.xml /robots.txt /feed.xml; do
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

cleanup_candidate() {
  systemctl stop "$CANDIDATE_UNIT" >/dev/null 2>&1 || true
  systemctl reset-failed "$CANDIDATE_UNIT" >/dev/null 2>&1 || true
}

start_candidate() {
  local existing
  cleanup_candidate
  existing="$(listener_pid "$CANDIDATE_PORT")"
  [ -z "$existing" ] || fail "Candidate port $CANDIDATE_PORT is already occupied by PID $existing"

  systemd-run     --quiet     --unit="${CANDIDATE_UNIT%.service}"     --collect     --property=Type=simple     --property="User=$APP_USER"     --property="Group=$APP_GROUP"     --property="WorkingDirectory=$NEW_RELEASE/.next/standalone"     --property=NoNewPrivileges=yes     --setenv="PORT=$CANDIDATE_PORT"     --setenv=HOSTNAME=127.0.0.1     --setenv=NODE_ENV=production     /usr/bin/node server.js
}

verify_live_release() {
  local pid uid cwd listener
  pid="$(systemctl show -p MainPID --value "$LIVE_UNIT")"
  [ -n "$pid" ] && [ "$pid" != "0" ] || fail "$LIVE_UNIT has no MainPID"

  uid="$(ps -o uid= -p "$pid" | tr -d ' ')"
  [ "$uid" = "$(id -u "$APP_USER")" ] || fail "$LIVE_UNIT PID $pid is not running as $APP_USER"

  cwd="$(readlink -f "/proc/$pid/cwd")"
  [ "$cwd" = "$NEW_RELEASE/.next/standalone" ] || fail "$LIVE_UNIT is running from unexpected cwd: $cwd"

  listener="$(listener_pid "$PORT")"
  [ "$listener" = "$pid" ] || fail "Live port $PORT is not owned by $LIVE_UNIT MainPID $pid"
}

live_touched=0

rollback() {
  local rc=$?
  trap - ERR INT TERM
  echo "PROMOTION_FAILED: preserving/restoring verified live release" >&2
  cleanup_candidate

  if [ "$live_touched" -eq 1 ] && [ -n "$CURRENT" ] && [ -f "$CURRENT/.next/standalone/server.js" ]; then
    ln -sfn "$CURRENT" "$CURRENT_LINK" || true
    systemctl restart "$LIVE_UNIT" || true
    wait_for_ready "$PORT" 30 || true
    smoke_routes "$PORT" || true
  fi

  exit "$rc"
}

trap rollback ERR INT TERM

# Reject a split-brain supervisor before candidate validation or live changes.
verify_live_listener

# Prove the exact release on an isolated transient systemd unit before touching live traffic.
start_candidate
wait_for_ready "$CANDIDATE_PORT" 30
smoke_routes "$CANDIDATE_PORT"
cleanup_candidate

# Protect the verified current release as rollback target before switching the symlink.
if [ -n "$CURRENT" ]; then
  ln -sfn "$CURRENT" "$PREVIOUS_LINK"
fi

live_touched=1
ln -sfn "$NEW_RELEASE" "$CURRENT_LINK"
systemctl restart "$LIVE_UNIT"
wait_for_ready "$PORT" 30
smoke_routes "$PORT"
verify_live_release

trap - ERR INT TERM

echo "promoted_release=$NEW_RELEASE"
echo "previous_release=${CURRENT:-none}"
echo "release_sha=$(cat "$NEW_RELEASE/.next/standalone/RELEASE_SHA")"
