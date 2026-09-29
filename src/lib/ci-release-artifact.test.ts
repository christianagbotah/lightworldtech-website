import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function source(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

describe('CI-built release artifacts', () => {
  test('quality workflow packages only verified main builds', () => {
    const workflow = source('.github/workflows/quality.yml');

    expect(workflow).toContain('actions/upload-artifact@v4');
    expect(workflow).toContain("github.event_name == 'push'");
    expect(workflow).toContain("github.ref == 'refs/heads/main'");
    expect(workflow).toContain('lightworldtech-runtime-${{ github.sha }}');
    expect(workflow).toContain('.next/standalone/RELEASE_SHA');
    expect(workflow).toContain('DEPLOY_PRISMA_VERSION');
    expect(workflow).toContain('sha256sum');
    expect(workflow).toContain('Include production Prisma engines');
    expect(workflow).toContain('rhel-openssl-1.0.x');
    expect(workflow).toContain('rhel-openssl-3.0.x');
  });

  test('artifact deployer verifies transfer and commit identity before promotion', () => {
    const deploy = source('ops/deploy-release-artifact.sh');

    expect(deploy).toContain('sha256sum -c');
    expect(deploy).toContain('^[0-9a-f]{40}$');
    expect(deploy).toContain('.next/standalone/RELEASE_SHA');
    expect(deploy).toContain('Artifact commit does not match requested commit');
    expect(deploy).toContain('prisma/migrations');
    expect(deploy).toContain('bunx "prisma@$PRISMA_VERSION" migrate deploy');
    expect(deploy).toContain('bash "$REL/ops/install-production-ops.sh"');
    expect(deploy).toContain('promote-release.sh');
    expect(deploy).toContain('chown -R lightworld:lightworld');
    expect(deploy).toContain('.next/standalone/.next/cache');
    expect(deploy).toContain('.next/standalone/.next/server/app');
    expect(deploy).toContain('chmod 0750');
    expect(deploy).toContain('chmod 0640');
    expect(deploy).toContain('MIN_FREE_KB=$((2 * 1024 * 1024))');
    expect(deploy).toContain('prune_stale_deployment_payloads "$ARTIFACT_ZIP"');
    expect(deploy).toContain("find \"$RELEASE_ROOT\" -mindepth 1 -maxdepth 1 -type d -name 'lightworldtech-*' -print0");
    expect(deploy).toContain("find \"$ARTIFACT_DIR\" -maxdepth 1 -type f -name 'lightworldtech-runtime-*.zip' -print0");
    expect(deploy).toContain('Insufficient free disk for safe deployment');
    expect(deploy).toContain('deployment_free_kb=');
  });

  test('runtime preparation grants only Next-managed write surfaces', () => {
    const prepare = source('ops/prepare-release-runtime.sh');

    expect(prepare).toContain('$STANDALONE/.next/cache');
    expect(prepare).toContain('$STANDALONE/.next/server/app');
    expect(prepare).toContain('runuser -u "$APP_USER" -- test -w "$STANDALONE/.next/server/app"');
    expect(prepare).toContain('chmod 0640');
  });

  test('production ops installer publishes deploy and recovery operations', () => {
    const installer = source('ops/install-production-ops.sh');
    const postgresTimer = source('ops/lightworld-backup-postgresql.timer');
    const uploadsTimer = source('ops/lightworld-backup-uploads.timer');
    const verifyTimer = source('ops/lightworld-backup-verify.timer');

    expect(installer).toContain('deploy-release-artifact.sh');
    expect(installer).toContain('backup-postgresql.sh');
    expect(installer).toContain('backup-uploads.sh');
    expect(installer).toContain('verify-backup-restore.sh');
    expect(installer).toContain('lightworld-backup-verify.timer');
    expect(installer).toContain('systemctl enable --now lightworld-backup-postgresql.timer');
    expect(postgresTimer).toContain('02:43:00 UTC');
    expect(uploadsTimer).toContain('03:03:00 UTC');
    expect(verifyTimer).toContain('Sun *-*-* 04:00:00 UTC');
  });

  test('artifact runtime is candidate-smoked before upload', () => {
    const workflow = source('.github/workflows/quality.yml');

    expect(workflow).toContain('Smoke standalone release runtime');
    expect(workflow).toContain('PORT=3017');
    expect(workflow).toContain('/api/admin/auth');
    expect(workflow).toContain('/api/client/auth');
    expect(workflow).toContain('/api/upload');
    expect(workflow).toContain('/blog');
  });

  test('production Prisma targets and candidate cleanup match the deployment host', () => {
    const schema = source('prisma/schema.prisma');
    const promote = source('ops/promote-release.sh');

    expect(schema).toContain('"rhel-openssl-1.0.x"');
    expect(schema).toContain('"rhel-openssl-1.1.x"');
    expect(schema).toContain('"rhel-openssl-3.0.x"');
    expect(promote).toContain('set -Eeuo pipefail');
    expect(promote).toContain('trap cleanup_candidate EXIT');
    expect(promote).toContain('trap - EXIT');
    expect(promote).toContain('LIGHTWORLD_CANDIDATE_PORT');
    expect(promote).toContain('3027');
    expect(promote).toContain('Candidate port $CANDIDATE_PORT is already occupied');
  });
});