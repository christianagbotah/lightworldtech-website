export function isLeadershipIntent(message: string): boolean {
  const q = message.trim().toLowerCase();

  return /managing director|\bmd\b|rober yaw essuon|who\s+(leads|runs|heads)|\b(leads|leader|leaders|leadership)\b|management|executive/.test(q);
}
