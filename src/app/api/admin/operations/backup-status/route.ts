import { NextRequest, NextResponse } from 'next/server';
import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { getSuperAdminContext } from '@/lib/admin-governance';

export const runtime = 'nodejs';

type BackupArtifact = {
  kind: 'database' | 'uploads';
  timestamp: string;
  sizeBytes: number;
  ageHours: number;
  freshness: 'fresh' | 'stale';
};

function backupDir(): string {
  return process.env.LIGHTWORLD_BACKUP_DIR || '/home/lightworld/shared/lightworldtech/backups';
}

async function newestArtifact(
  directory: string,
  matcher: (name: string) => boolean,
  kind: BackupArtifact['kind'],
): Promise<BackupArtifact | null> {
  const entries = await readdir(directory, { withFileTypes: true });
  const candidates = entries.filter((entry) => entry.isFile() && matcher(entry.name));

  let latest: { modified: number; sizeBytes: number } | null = null;
  for (const entry of candidates) {
    const info = await stat(path.join(directory, entry.name));
    if (!latest || info.mtimeMs > latest.modified) {
      latest = { modified: info.mtimeMs, sizeBytes: info.size };
    }
  }

  if (!latest) return null;
  const ageHours = Math.max(0, (Date.now() - latest.modified) / 3_600_000);

  return {
    kind,
    timestamp: new Date(latest.modified).toISOString(),
    sizeBytes: latest.sizeBytes,
    ageHours: Math.round(ageHours * 10) / 10,
    freshness: ageHours <= 36 ? 'fresh' : 'stale',
  };
}

export async function GET(request: NextRequest) {
  const actor = await getSuperAdminContext(request);
  if (!actor) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  try {
    const directory = backupDir();
    const [database, uploads] = await Promise.all([
      newestArtifact(
        directory,
        (name) => /^lightworld_website_db-.*\.dump$/i.test(name),
        'database',
      ),
      newestArtifact(
        directory,
        (name) => /^uploads-.*\.tar\.gz$/i.test(name),
        'uploads',
      ),
    ]);

    const status =
      database?.freshness === 'fresh' && uploads?.freshness === 'fresh'
        ? 'healthy'
        : database || uploads
          ? 'attention'
          : 'missing';

    return NextResponse.json(
      {
        success: true,
        data: {
          status,
          database,
          uploads,
          checkedAt: new Date().toISOString(),
          restoreVerification: {
            status: 'not_verified',
            message:
              'Backup artifacts are present, but this panel does not claim a successful restore rehearsal.',
          },
        },
      },
      { headers: { 'Cache-Control': 'private, no-store, max-age=0' } },
    );
  } catch (error) {
    console.error('Backup readiness check failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Unable to inspect backup readiness',
      },
      { status: 500 },
    );
  }
}
