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
  });

  test('production ops installer publishes the artifact deployer', () => {
    const installer = source('ops/install-production-ops.sh');

    expect(installer).toContain('deploy-release-artifact.sh');
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
  });
});
