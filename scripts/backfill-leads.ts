import { PrismaClient } from '@prisma/client';
import { qualifyLead } from '../src/lib/lead-intelligence';

const db = new PrismaClient();

async function main() {
  const messages = await db.contactMessage.findMany({
    orderBy: { createdAt: 'asc' },
  });

  const existing = new Set(
    (await db.lead.findMany({
      where: { contactMessageId: { not: null } },
      select: { contactMessageId: true },
    }))
      .map((lead) => lead.contactMessageId)
      .filter((id): id is string => Boolean(id)),
  );

  let created = 0;

  for (const message of messages) {
    if (existing.has(message.id)) continue;
    const qualification = qualifyLead(message);

    await db.lead.create({
      data: {
        contactMessageId: message.id,
        name: message.name,
        email: message.email,
        phone: message.phone,
        source: 'website-contact',
        ...qualification,
        lastActivityAt: message.updatedAt,
        createdAt: message.createdAt,
      },
    });
    created += 1;
  }

  console.log(JSON.stringify({ scanned: messages.length, created }));
}

main()
  .finally(() => db.$disconnect())
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
