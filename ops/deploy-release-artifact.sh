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

fail() {
  echo "ERROR: $*" >&2
  exit 1
}

[ "$(id -u)" -eq 0 ] || fail "Run this deployer as root"
[ -n "$ARTIFACT_ZIP" ] && [ -n "$EXPECTED_SHA" ] || fail "Usage: $0 <github-artifact.zip> <40-char-git-sha>"
[[ "$EXPECTED_SHA" =~ ^[0-9a-f]{40}$ ]] || fail "Expected SHA must be a lowercase 40-character Git commit SHA"
[ -f "$ARTIFACT_ZIP" ] || fail "Artifact ZIP does not exist: $ARTIFACT_ZIP"

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

echo "artifact_release=$REL"
echo "artifact_sha=$EXPECTED_SHA"
echo "artifact_prisma_version=$PRISMA_VERSION"
