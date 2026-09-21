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


export function isCompletedProjectNextStepsIntent(message: string): boolean {
  const q = message.trim().toLowerCase();
  return /what\s+happens\s+(after|next)|after\s+i\s+submit|after\s+submitting|what\s+comes\s+next|next\s+steps?|what\s+do\s+i\s+do\s+next|once\s+i\s+submit|after\s+the\s+brief/.test(q);
}

export function isCompletedProjectPricingIntent(message: string): boolean {
  const q = message.trim().toLowerCase();
  return /price|pricing|cost|budget|quote|estimate|how\s+much|payment/.test(q);
}

export function isCompletedProjectChangeIntent(message: string): boolean {
  const q = message.trim().toLowerCase();
  return /change|edit|update|correct|modify|add\s+something|forgot\s+to\s+mention|brief/.test(q);
}

export function isCompletedProjectContactIntent(message: string): boolean {
  const q = message.trim().toLowerCase();
  return /who\s+(will|would)\s+contact|who\s+reviews?|when\s+will\s+.*contact|response\s+time|how\s+long.*(reply|respond|contact)|hear\s+back/.test(q);
}

export function isCompletedProjectRestartIntent(message: string): boolean {
  const q = message.trim().toLowerCase();
  return /start\s+(a\s+)?new\s+project|another\s+project|start\s+over|new\s+brief|restart\s+.*project/.test(q);
}

export function isCompletedProjectContextIntent(message: string): boolean {
  const q = message.trim().toLowerCase();
  return /my\s+(project|brief|submission)|this\s+(project|brief)|that\s+(project|brief)|the\s+(project|brief|submission)|submit|submitted/.test(q);
}
