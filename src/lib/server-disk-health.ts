import { statfs } from 'node:fs/promises';

export type ServerDiskHealth = {
  status: 'healthy' | 'attention';
  path: string;
  totalBytes: number;
  usedBytes: number;
  availableBytes: number;
  usedPercent: number;
  minimumFreeBytes: number;
  warning: string;
};

export const SERVER_DISK_PATH = '/home/lightworld/shared/lightworldtech';
export const SERVER_DISK_MINIMUM_FREE_BYTES = 2 * 1024 ** 3;
export const SERVER_DISK_WARNING_FREE_BYTES = 5 * 1024 ** 3;
export const SERVER_DISK_WARNING_USED_PERCENT = 95;

export async function getServerDiskHealth(): Promise<ServerDiskHealth> {
  try {
    const stats = await statfs(SERVER_DISK_PATH, { bigint: true });
    const totalBytes = Number(stats.blocks * stats.bsize);
    const availableBytes = Number(stats.bavail * stats.bsize);
    const usedBytes = Math.max(0, totalBytes - availableBytes);
    const usedPercent = totalBytes > 0
      ? Math.round((usedBytes / totalBytes) * 1000) / 10
      : 0;
    const healthy =
      availableBytes >= SERVER_DISK_WARNING_FREE_BYTES &&
      usedPercent < SERVER_DISK_WARNING_USED_PERCENT;

    return {
      status: healthy ? 'healthy' : 'attention',
      path: SERVER_DISK_PATH,
      totalBytes,
      usedBytes,
      availableBytes,
      usedPercent,
      minimumFreeBytes: SERVER_DISK_MINIMUM_FREE_BYTES,
      warning: healthy
        ? ''
        : availableBytes < SERVER_DISK_MINIMUM_FREE_BYTES
          ? 'Disk space is below the 2 GB deployment safety reserve. Free space before deploying.'
          : 'Disk capacity is inside the warning band. Review old artifacts, releases, logs or caches before it becomes critical.',
    };
  } catch (error) {
    console.error('Server disk health check failed:', error);
    return {
      status: 'attention',
      path: SERVER_DISK_PATH,
      totalBytes: 0,
      usedBytes: 0,
      availableBytes: 0,
      usedPercent: 0,
      minimumFreeBytes: SERVER_DISK_MINIMUM_FREE_BYTES,
      warning: 'Disk capacity could not be verified from the production host.',
    };
  }
}
