export function isLeadershipIntent(message: string): boolean {
  const q = message.trim().toLowerCase();

  return /managing director|\bmd\b|rober yaw essuon|who\s+(leads|runs|heads)|\b(leads|leader|leaders|leadership)\b|management|executive/.test(q);
}

export function isTrustIntent(message: string): boolean {
  const q = message.trim().toLowerCase();

  return /trust center|security practice|security controls?|privacy practice|privacy controls?|responsible ai|data handling|protect.*data|secure.*(website|system|platform)|report.*(security|vulnerab)|vulnerab/.test(q);
}

export function isNewsroomIntent(message: string): boolean {
  const q = message.trim().toLowerCase();

  return /newsroom|media center|media centre|media enquiry|media inquiry|media information|media resources?|media relations?|press coverage|press contact|press kit|press release|\\bpress\\b|journalist|company fact sheet|brand resources?/.test(q);
}
