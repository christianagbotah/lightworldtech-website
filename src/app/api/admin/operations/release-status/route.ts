import { NextRequest, NextResponse } from 'next/server';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { getActiveAdminContext } from '@/lib/admin-governance';

export const runtime = 'nodejs';

function releaseFile(): string {
  return path.join(process.cwd(), 'RELEASE_SHA');
}

function validSha(value: string): string {
  const normalized = value.trim().toLowerCase();
  return /^[a-f0-9]{40}$/.test(normalized) ? normalized : '';
}

export async function GET(request: NextRequest) {
  const actor = await getActiveAdminContext(request);
  if (!actor) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  let sha = '';
  let artifactTimestamp: string | null = null;

  try {
    const file = releaseFile();
    const [raw, info] = await Promise.all([readFile(file, 'utf8'), stat(file)]);
    sha = validSha(raw);
    artifactTimestamp = info.mtime.toISOString();
  } catch {
    // Local development and non-artifact runtimes may not contain RELEASE_SHA.
  }

  const uptimeSeconds = Math.max(0, Math.round(process.uptime()));
  const startedAt = new Date(Date.now() - uptimeSeconds * 1000).toISOString();

  return NextResponse.json(
    {
      success: true,
      data: {
        releaseSha: sha || null,
        shortSha: sha ? sha.slice(0, 12) : null,
        artifactTimestamp,
        startedAt,
        uptimeSeconds,
        nodeVersion: process.version,
        environment: process.env.NODE_ENV || 'unknown',
        provenance: sha ? 'verified_artifact' : 'unavailable',
      },
    },
    { headers: { 'Cache-Control': 'private, no-store, max-age=0' } },
  );
}
