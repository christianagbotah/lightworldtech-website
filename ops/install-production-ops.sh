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

for script in prepare-release-runtime.sh promote-release.sh deploy-release-artifact.sh prune-releases.sh backup-postgresql.sh backup-uploads.sh verify-backup-restore.sh; do
  bash -n "$SOURCE_DIR/$script"
  install -o root -g "$APP_GROUP" -m 0700 "$SOURCE_DIR/$script" "$TARGET_DIR/$script"
done

# The dispatcher runs as the unprivileged lightworld service account, so its
# script must remain readable/executable by the application group. Deployment
# and release-management scripts stay root-only.
bash -n "$SOURCE_DIR/run-sms-dispatch.sh"
install -o root -g "$APP_GROUP" -m 0750 "$SOURCE_DIR/run-sms-dispatch.sh" "$TARGET_DIR/run-sms-dispatch.sh"

for unit in lightworldtech-app.service lightworld-sms-dispatch.service lightworld-sms-dispatch.timer lightworld-backup-postgresql.service lightworld-backup-postgresql.timer lightworld-backup-uploads.service lightworld-backup-uploads.timer lightworld-backup-verify.service lightworld-backup-verify.timer; do
  install -o root -g root -m 0644 "$SOURCE_DIR/$unit" "/etc/systemd/system/$unit"
done

systemctl daemon-reload
systemctl enable lightworldtech-app.service
systemctl enable --now lightworld-sms-dispatch.timer
systemctl enable --now lightworld-backup-postgresql.timer
systemctl enable --now lightworld-backup-uploads.timer
systemctl enable --now lightworld-backup-verify.timer

# The website has one production supervisor: systemd. A legacy PM2 unit may still
# exist on older hosts; disable it at boot, and stop it when the systemd app is
# already serving traffic so both managers can never compete for port 3007.
systemctl disable pm2-lightworld.service >/dev/null 2>&1 || true
if systemctl is-active --quiet lightworldtech-app.service; then
  systemctl stop pm2-lightworld.service >/dev/null 2>&1 || true
fi

echo "Installed production operations scripts into $TARGET_DIR"
echo "Enabled website, SMS dispatcher, daily backup and weekly restore-verification timers"
echo "Legacy pm2-lightworld.service is disabled"
