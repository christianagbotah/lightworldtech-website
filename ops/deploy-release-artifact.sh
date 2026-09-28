#!/usr/bin/env bash
set -euo pipefail

# Production runs Bun under the dedicated lightworld account. Root does not
# necessarily inherit that user's shell PATH during artifact deployment.
export PATH="/home/lightworld/.bun/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"

ARTIFACT_ZIP="${1:-}"
EXPECTED_SHA="${2:-}"
RELEASE_ROOT="/home/lightworld/releases"
SHARED="/home/lightworld/shared/lightworldtech"
OPS="$SHARED/ops"
ARTIFACT_DIR="$SHARED/artifacts"
CURRENT_LINK="/home/lightworld/webapps/lightworldtech"
PREVIOUS_LINK="/home/lightworld/webapps/lightworldtech-previous"
MIN_FREE_KB=$((2 * 1024 * 1024))

fail() {
  echo "ERROR: $*" >&2
  exit 1
}

release_sha_from_path() {
  local release_path="${1:-}"
  [ -n "$release_path" ] || return 0
  [ -f "$release_path/.next/standalone/RELEASE_SHA" ] || return 0
  tr -d '\\r\\n' < "$release_path/.next/standalone/RELEASE_SHA"
}

same_path() {
  local left="${1:-}"
  local right="${2:-}"
  [ -n "$left" ] && [ -n "$right" ] || return 1
  [ "$(readlink -f "$left" 2>/dev/null || true)" = "$(readlink -f "$right" 2>/dev/null || true)" ]
}

prune_stale_deployment_payloads() {
  local incoming_artifact="${1:-}"
  local current_release=""
  local previous_release=""
  local current_sha=""
  local previous_sha=""
  local path=""
  local artifact=""

  current_release="$(readlink -f "$CURRENT_LINK" 2>/dev/null || true)"
  previous_release="$(readlink -f "$PREVIOUS_LINK" 2>/dev/null || true)"
  current_sha="$(release_sha_from_path "$current_release")"
  previous_sha="$(release_sha_from_path "$previous_release")"

  while IFS= read -r -d '' path; do
    if [ "$path" != "$current_release" ] && [ "$path" != "$previous_release" ]; then
      rm -rf -- "$path"
    fi
  done < <(find "$RELEASE_ROOT" -mindepth 1 -maxdepth 1 -type d -name 'lightworldtech-*' -print0)

  while IFS= read -r -d '' artifact; do
    if ! same_path "$artifact" "$incoming_artifact"; then
      rm -f -- "$artifact"
    fi
  done < <(find "$SHARED" -maxdepth 1 -type f -name 'lightworldtech-runtime-*.zip' -print0)

  install -d -m 0755 "$ARTIFACT_DIR"
  while IFS= read -r -d '' artifact; do
    if same_path "$artifact" "$incoming_artifact"; then
      continue
    fi
    if [ -n "$current_sha" ] && [ "$(basename "$artifact")" = "lightworldtech-runtime-$current_sha.zip" ]; then
      continue
    fi
    if [ -n "$previous_sha" ] && [ "$(basename "$artifact")" = "lightworldtech-runtime-$previous_sha.zip" ]; then
      continue
    fi
    rm -f -- "$artifact"
  done < <(find "$ARTIFACT_DIR" -maxdepth 1 -type f -name 'lightworldtech-runtime-*.zip' -print0)
}

ensure_disk_reserve() {
  local available_kb
  available_kb="$(df -Pk "$SHARED" | awk 'NR == 2 { print $4 }')"
  [[ "$available_kb" =~ ^[0-9]+$ ]] || fail "Could not determine available disk space"
  [ "$available_kb" -ge "$MIN_FREE_KB" ] || fail "Insufficient free disk for safe deployment: ${available_kb}KB available; require at least ${MIN_FREE_KB}KB"
}

[ "$(id -u)" -eq 0 ] || fail "Run this deployer as root"
[ -n "$ARTIFACT_ZIP" ] && [ -n "$EXPECTED_SHA" ] || fail "Usage: $0 <github-artifact.zip> <40-char-git-sha>"
[[ "$EXPECTED_SHA" =~ ^[0-9a-f]{40}$ ]] || fail "Expected SHA must be a lowercase 40-character Git commit SHA"
[ -f "$ARTIFACT_ZIP" ] || fail "Artifact ZIP does not exist: $ARTIFACT_ZIP"

prune_stale_deployment_payloads "$ARTIFACT_ZIP"
ensure_disk_reserve

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

unzip -q "$ARTIFACT_ZIP" -d "$WORK"
ARCHIVE="$WORK/lightworldtech-runtime-$EXPECTED_SHA.tar.gz"
CHECKSUM="$ARCHIVE.sha256"
[ -f "$ARCHIVE" ] || fail "Runtime archive is missing from the GitHub artifact"
[ -f "$CHECKSUM" ] || fail "Runtime checksum is missing from the GitHub artifact"

(
  cd "$WORK"
  sha256sum -c "$(basename "$CHECKSUM")"
)

STAMP="$(date -u +%Y%m%d-%H%M%S)"
REL="$RELEASE_ROOT/lightworldtech-${EXPECTED_SHA:0:12}-$STAMP"
install -d -m 0755 "$REL"
tar -xzf "$ARCHIVE" -C "$REL"

# GitHub artifacts preserve numeric ownership from the build runner. Keep the
# release immutable/root-owned, but explicitly hand the Next.js runtime cache to
# the dedicated application service account so fetch/prerender cache writes do
# not fail after promotion.
install -d -o lightworld -g lightworld -m 0750 "$REL/.next/standalone/.next/cache"
chown -R lightworld:lightworld "$REL/.next/standalone/.next/cache"
find "$REL/.next/standalone/.next/cache" -type d -exec chmod 0750 {} +

# Next.js 16 may refresh prerendered App Router output in server/app at runtime.
# The artifact itself stays immutable apart from the two framework-managed
# cache surfaces that the application process must be able to update.
chown -R lightworld:lightworld "$REL/.next/standalone/.next/server/app"
find "$REL/.next/standalone/.next/server/app" -type d -exec chmod 0750 {} +
find "$REL/.next/standalone/.next/server/app" -type f -exec chmod 0640 {} +

[ -f "$REL/.next/standalone/server.js" ] || fail "Standalone server is missing from extracted runtime"
[ -f "$REL/.next/standalone/RELEASE_SHA" ] || fail "RELEASE_SHA is missing from extracted runtime"
[ "$(tr -d '\r\n' < "$REL/.next/standalone/RELEASE_SHA")" = "$EXPECTED_SHA" ] || fail "Artifact commit does not match requested commit"
[ -d "$REL/prisma/migrations" ] || fail "Prisma migration history is missing from extracted runtime"
[ -f "$REL/prisma/schema.prisma" ] || fail "Prisma schema is missing from extracted runtime"
[ -f "$REL/DEPLOY_PRISMA_VERSION" ] || fail "Prisma deploy version marker is missing"

PRISMA_VERSION="$(tr -d '\r\n' < "$REL/DEPLOY_PRISMA_VERSION")"
[[ "$PRISMA_VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+([+-][0-9A-Za-z.-]+)?$ ]] || fail "Invalid Prisma version marker: $PRISMA_VERSION"

ln -sfn "$SHARED/.env" "$REL/.env"
ln -sfn "$SHARED/.env" "$REL/.next/standalone/.env"

# Keep production operation scripts synchronized with the exact promoted commit.
bash "$REL/ops/install-production-ops.sh"

# Production migrations remain a separate, explicit step. The application runtime
# itself is never rebuilt on the VPS.
(
  cd "$REL"
  bunx "prisma@$PRISMA_VERSION" migrate deploy --schema prisma/schema.prisma
)

"$OPS/promote-release.sh" "$REL"

prune_stale_deployment_payloads "$ARTIFACT_ZIP"
ensure_disk_reserve
echo "deployment_free_kb=$(df -Pk "$SHARED" | awk 'NR == 2 { print $4 }')"

echo "artifact_release=$REL"
echo "artifact_sha=$EXPECTED_SHA"
echo "artifact_prisma_version=$PRISMA_VERSION"