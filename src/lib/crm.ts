import 'server-only';

import { db } from '@/lib/db';
import { deriveLeadIntelligence } from '@/lib/lead-intelligence';

export async function ensureHistoricalLeads(maxBatches = 20, batchSize = 100): Promise<number> {
  let created = 0;

  for (let batch = 0; batch < maxBatches; batch += 1) {
    const missing = await db.contactMessage.findMany({
      where: { lead: null },
      select: { id: true, subject: true, message: true },
      orderBy: { createdAt: 'asc' },
      take: batchSize,
    });

    if (missing.length === 0) break;

    for (const contact of missing) {
      const intelligence = deriveLeadIntelligence({
        subject: contact.subject,
        message: contact.message,
      });

      try {
        await db.lead.create({
          data: {
            contactMessageId: contact.id,
            source: intelligence.source,
            summary: intelligence.summary,
            tags: JSON.stringify(intelligence.tags),
            priority: intelligence.priority,
          },
        });
        created += 1;
      } catch (error) {
        const code = (error as { code?: string })?.code;
        if (code !== 'P2002') throw error;
      }
    }

    if (missing.length < batchSize) break;
  }

  return created;
}

export async function getCrmSummary() {
  await ensureHistoricalLeads();

  const now = new Date();
  const [total, won, lost, highPriority, overdueFollowUps] = await Promise.all([
    db.lead.count(),
    db.lead.count({ where: { status: 'won' } }),
    db.lead.count({ where: { status: 'lost' } }),
    db.lead.count({ where: { priority: 'high' } }),
    db.lead.count({
      where: {
        nextFollowUp: { lt: now },
        status: { notIn: ['won', 'lost'] },
      },
    }),
  ]);

  return {
    total,
    open: Math.max(0, total - won - lost),
    won,
    lost,
    highPriority,
    overdueFollowUps,
  };
}
