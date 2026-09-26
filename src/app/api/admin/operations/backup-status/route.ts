import { NextRequest, NextResponse } from 'next/server';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { getSuperAdminContext } from '@/lib/admin-governance';

export const runtime = 'nodejs';

type BackupArtifact = {
  kind: 'database' | 'uploads';
  filename: string;
  timestamp: string;
  sizeBytes: number;
  ageHours: number;
  freshness: 'fresh' | 'stale';
};

type RestoreVerification = {
  status: 'verified' | 'stale' | 'failed' | 'not_verified';
  verifiedAt: string | null;
  ageHours: number | null;
  databaseArtifact: string;
  uploadsArtifact: string;
  publicTableCount: number | null;
  uploadArchiveEntries: number | null;
  method: string;
  message: string;
};

function backupDir(): string {
  return process.env.LIGHTWORLD_BACKUP_DIR || '/home/lightworld/shared/lightworldtech/backups';
}

async function newestArtifact(
  directory: string,
  matcher: (name: string) => boolean,
  kind: BackupArtifact['kind'],
): Promise<BackupArtifact | null> {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT' || (error as NodeJS.ErrnoException).code === 'EACCES') {
      return null;
    }
    throw error;
  }

  const candidates = entries.filter((entry) => entry.isFile() && matcher(entry.name));
  let latest: { filename: string; modified: number; sizeBytes: number } | null = null;
  for (const entry of candidates) {
    const info = await stat(path.join(directory, entry.name));
    if (!latest || info.mtimeMs > latest.modified) {
      latest = { filename: entry.name, modified: info.mtimeMs, sizeBytes: info.size };
    }
  }

  if (!latest) return null;
  const ageHours = Math.max(0, (Date.now() - latest.modified) / 3_600_000);
  return {
    kind,
    filename: latest.filename,
    timestamp: new Date(latest.modified).toISOString(),
    sizeBytes: latest.sizeBytes,
    ageHours: Math.round(ageHours * 10) / 10,
    freshness: ageHours <= 36 ? 'fresh' : 'stale',
  };
}

async function restoreVerification(directory: string): Promise<RestoreVerification> {
  const marker = path.join(directory, 'restore-verification.json');
  try {
    const raw = await readFile(marker, 'utf8');
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const verifiedAt = typeof parsed.verifiedAt === 'string' ? parsed.verifiedAt : null;
    const verifiedTime = verifiedAt ? new Date(verifiedAt).getTime() : Number.NaN;
    if (!verifiedAt || !Number.isFinite(verifiedTime) || parsed.status !== 'verified') {
      return {
        status: 'failed',
        verifiedAt,
        ageHours: null,
        databaseArtifact: String(parsed.databaseArtifact || ''),
        uploadsArtifact: String(parsed.uploadsArtifact || ''),
        publicTableCount: typeof parsed.publicTableCount === 'number' ? parsed.publicTableCount : null,
        uploadArchiveEntries: typeof parsed.uploadArchiveEntries === 'number' ? parsed.uploadArchiveEntries : null,
        method: String(parsed.method || ''),
        message: 'The latest restore-verification marker is invalid or reports a failed rehearsal.',
      };
    }

    const ageHours = Math.max(0, (Date.now() - verifiedTime) / 3_600_000);
    const stale = ageHours > 8 * 24;
    return {
      status: stale ? 'stale' : 'verified',
      verifiedAt,
      ageHours: Math.round(ageHours * 10) / 10,
      databaseArtifact: String(parsed.databaseArtifact || ''),
      uploadsArtifact: String(parsed.uploadsArtifact || ''),
      publicTableCount: typeof parsed.publicTableCount === 'number' ? parsed.publicTableCount : null,
      uploadArchiveEntries: typeof parsed.uploadArchiveEntries === 'number' ? parsed.uploadArchiveEntries : null,
      method: String(parsed.method || ''),
      message: stale
        ? 'The last isolated restore rehearsal is older than eight days.'
        : 'The latest backup rehearsal restored PostgreSQL into an isolated temporary cluster and validated the uploads archive.',
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return {
        status: 'not_verified',
        verifiedAt: null,
        ageHours: null,
        databaseArtifact: '',
        uploadsArtifact: '',
        publicTableCount: null,
        uploadArchiveEntries: null,
        method: '',
        message: 'No isolated restore rehearsal has been recorded yet.',
      };
    }
    console.error('Restore verification marker read failed:', error);
    return {
      status: 'failed',
      verifiedAt: null,
      ageHours: null,
      databaseArtifact: '',
      uploadsArtifact: '',
      publicTableCount: null,
      uploadArchiveEntries: null,
      method: '',
      message: 'The restore-verification marker could not be read or parsed.',
    };
  }
}

export async function GET(request: NextRequest) {
  const actor = await getSuperAdminContext(request);
  if (!actor) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  try {
    const directory = backupDir();
    const [database, uploads, restore] = await Promise.all([
      newestArtifact(
        path.join(directory, 'postgresql'),
        (name) => /^lightworld_website_db-.*\.dump$/i.test(name),
        'database',
      ),
      newestArtifact(
        path.join(directory, 'uploads'),
        (name) => /^uploads-.*\.tar\.gz$/i.test(name),
        'uploads',
      ),
      restoreVerification(directory),
    ]);

    const artifactsFresh =
      database?.freshness === 'fresh' && uploads?.freshness === 'fresh';
    const status =
      artifactsFresh && restore.status === 'verified'
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
          restoreVerification: restore,
        },
      },
      { headers: { 'Cache-Control': 'private, no-store, max-age=0' } },
    );
  } catch (error) {
    console.error('Backup readiness check failed:', error);
    return NextResponse.json(
      { success: false, error: 'Unable to inspect backup readiness' },
      { status: 500 },
    );
  }
}
