import 'server-only';

import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { nextInvoiceNumber } from '@/lib/finance';

function days(value: string | undefined, fallback: number, min: number, max: number) {
  const parsed = Number(value || fallback);
  return Math.max(min, Math.min(max, Number.isFinite(parsed) ? parsed : fallback));
}

export async function createDueRenewalInvoiceDrafts() {
  const enabled = process.env.AUTO_RENEWAL_DRAFT_INVOICES === 'true';
  const configuredBatch = Number(process.env.RENEWAL_DRAFT_INVOICE_BATCH_SIZE || 10);
  const batchSize = Math.max(1, Math.min(50, Number.isFinite(configuredBatch) ? configuredBatch : 10));
  const dueDays = days(process.env.RENEWAL_DRAFT_INVOICE_DUE_DAYS, 7, 0, 60);

  if (!enabled) {
    return { enabled: false, considered: 0, created: 0, skipped: 0 };
  }

  const now = new Date();
  const horizon = new Date(now.getTime() + 365 * 86400000);
  const services = await db.clientServiceAccount.findMany({
    where: {
      autoRenew: true,
      recurringAmount: { gt: 0 },
      status: { in: ['active', 'suspended'] },
      OR: [
        { nextDueDate: { not: null, lte: horizon } },
        { expiryDate: { not: null, lte: horizon } },
      ],
    },
    include: {
      organization: { select: { id: true, name: true } },
    },
    orderBy: [{ nextDueDate: 'asc' }, { expiryDate: 'asc' }],
    take: 500,
  });

  let considered = 0;
  let created = 0;
  let skipped = 0;

  for (const service of services) {
    if (created >= batchSize) break;

    const renewalDate = service.nextDueDate || service.expiryDate;
    if (!renewalDate) continue;

    const daysUntilRenewal = Math.ceil((renewalDate.getTime() - now.getTime()) / 86400000);
    if (daysUntilRenewal > service.renewalNoticeDays) continue;

    considered += 1;

    const result = await db.$transaction(async (tx) => {
      const cycleKey =
        'lightworld-auto-renewal-draft:' +
        service.id +
        ':' +
        renewalDate.toISOString().slice(0, 10);

      await tx.$queryRawUnsafe(
        'SELECT pg_advisory_xact_lock(hashtext($1))',
        cycleKey,
      );

      const duplicate = await tx.clientInvoice.findFirst({
        where: {
          serviceId: service.id,
          renewalForDate: renewalDate,
          status: { not: 'void' },
        },
        select: { id: true },
      });
      if (duplicate) return null;

      const issueDate = new Date();
      const fallbackDueDate = new Date(issueDate.getTime() + dueDays * 86400000);
      const dueDate = renewalDate.getTime() >= issueDate.getTime() ? renewalDate : fallbackDueDate;
      const invoiceNumber = await nextInvoiceNumber(issueDate);
      const amount = new Prisma.Decimal(service.recurringAmount).toDecimalPlaces(2);

      const invoice = await tx.clientInvoice.create({
        data: {
          invoiceNumber,
          organizationId: service.organizationId,
          serviceId: service.id,
          projectId: service.projectId || null,
          status: 'draft',
          currency: service.currency,
          issueDate,
          dueDate,
          renewalForDate: renewalDate,
          subtotal: amount,
          discount: new Prisma.Decimal(0),
          taxTreatment: 'none',
          taxableAmount: amount,
          vatRate: new Prisma.Decimal(0),
          vatAmount: new Prisma.Decimal(0),
          nhilRate: new Prisma.Decimal(0),
          nhilAmount: new Prisma.Decimal(0),
          getfundRate: new Prisma.Decimal(0),
          getfundAmount: new Prisma.Decimal(0),
          tax: new Prisma.Decimal(0),
          total: amount,
          notes:
            'Automatically prepared renewal draft for human finance review. Confirm tax treatment, scope, price and due date before issuing.',
          createdBy: 'System renewal draft scheduler',
          lines: {
            create: [{
              description:
                service.name +
                (service.planName ? ' · ' + service.planName : '') +
                ' renewal',
              quantity: new Prisma.Decimal(1),
              unitPrice: amount,
              amount,
              order: 0,
            }],
          },
        },
      });

      await tx.adminAuditLog.create({
        data: {
          adminId: null,
          adminEmail: '',
          adminName: 'System automation',
          action: 'system.finance_renewal_draft_created',
          entity: 'ClientInvoice',
          entityId: invoice.id,
          details: JSON.stringify({
            invoiceNumber,
            organizationId: service.organizationId,
            organizationName: service.organization.name,
            serviceId: service.id,
            serviceName: service.name,
            renewalForDate: renewalDate.toISOString(),
            amount: amount.toFixed(2),
            currency: service.currency,
          }),
        },
      });

      return invoice;
    });

    if (result) created += 1;
    else skipped += 1;
  }

  return { enabled: true, considered, created, skipped };
}


export async function createDueProjectRenewalInvoiceDrafts() {
  const enabled = process.env.AUTO_PROJECT_RENEWAL_DRAFT_INVOICES === 'true';
  const configuredBatch = Number(process.env.PROJECT_RENEWAL_DRAFT_INVOICE_BATCH_SIZE || 10);
  const batchSize = Math.max(1, Math.min(50, Number.isFinite(configuredBatch) ? configuredBatch : 10));
  const dueDays = days(process.env.PROJECT_RENEWAL_DRAFT_INVOICE_DUE_DAYS, 7, 0, 60);

  if (!enabled) {
    return { enabled: false, considered: 0, created: 0, skipped: 0 };
  }

  const now = new Date();
  const horizon = new Date(now.getTime() + 365 * 86400000);
  const projects = await db.clientProject.findMany({
    where: {
      autoRenew: true,
      renewalAmount: { gt: 0 },
      status: { in: ['planned', 'active', 'on_hold'] },
      nextRenewalDate: { not: null, lte: horizon },
    },
    include: {
      organization: { select: { id: true, name: true } },
    },
    orderBy: { nextRenewalDate: 'asc' },
    take: 500,
  });

  let considered = 0;
  let created = 0;
  let skipped = 0;

  for (const project of projects) {
    if (created >= batchSize || !project.nextRenewalDate) break;

    const daysUntilRenewal = Math.ceil(
      (project.nextRenewalDate.getTime() - now.getTime()) / 86400000,
    );
    if (daysUntilRenewal > project.renewalNoticeDays) continue;

    considered += 1;

    const result = await db.$transaction(async (tx) => {
      const cycleKey =
        'lightworld-auto-project-renewal-draft:' +
        project.id +
        ':' +
        project.nextRenewalDate!.toISOString().slice(0, 10);

      await tx.$queryRawUnsafe(
        'SELECT pg_advisory_xact_lock(hashtext($1))',
        cycleKey,
      );

      const duplicate = await tx.clientInvoice.findFirst({
        where: {
          projectId: project.id,
          renewalForDate: project.nextRenewalDate,
          status: { not: 'void' },
        },
        select: { id: true },
      });
      if (duplicate) return null;

      const issueDate = new Date();
      const fallbackDueDate = new Date(issueDate.getTime() + dueDays * 86400000);
      const dueDate =
        project.nextRenewalDate.getTime() >= issueDate.getTime()
          ? project.nextRenewalDate
          : fallbackDueDate;
      const invoiceNumber = await nextInvoiceNumber(issueDate);
      const amount = new Prisma.Decimal(project.renewalAmount).toDecimalPlaces(2);

      const invoice = await tx.clientInvoice.create({
        data: {
          invoiceNumber,
          organizationId: project.organizationId,
          serviceId: null,
          projectId: project.id,
          status: 'draft',
          currency: project.renewalCurrency,
          issueDate,
          dueDate,
          renewalForDate: project.nextRenewalDate,
          subtotal: amount,
          discount: new Prisma.Decimal(0),
          taxTreatment: 'none',
          taxableAmount: amount,
          vatRate: new Prisma.Decimal(0),
          vatAmount: new Prisma.Decimal(0),
          nhilRate: new Prisma.Decimal(0),
          nhilAmount: new Prisma.Decimal(0),
          getfundRate: new Prisma.Decimal(0),
          getfundAmount: new Prisma.Decimal(0),
          tax: new Prisma.Decimal(0),
          total: amount,
          notes:
            'Automatically prepared project renewal draft for human finance review. Confirm tax treatment, scope, price and due date before issuing.',
          createdBy: 'System project renewal draft scheduler',
          lines: {
            create: [{
              description:
                project.name +
                ' · ' +
                project.renewalCycle.replaceAll('_', ' ') +
                ' project renewal',
              quantity: new Prisma.Decimal(1),
              unitPrice: amount,
              amount,
              order: 0,
            }],
          },
        },
      });

      await tx.adminAuditLog.create({
        data: {
          adminId: null,
          adminEmail: '',
          adminName: 'System automation',
          action: 'system.finance_project_renewal_draft_created',
          entity: 'ClientInvoice',
          entityId: invoice.id,
          details: JSON.stringify({
            invoiceNumber,
            organizationId: project.organizationId,
            organizationName: project.organization.name,
            projectId: project.id,
            projectName: project.name,
            renewalForDate: project.nextRenewalDate!.toISOString(),
            amount: amount.toFixed(2),
            currency: project.renewalCurrency,
          }),
        },
      });

      return invoice;
    });

    if (result) created += 1;
    else skipped += 1;
  }

  return { enabled: true, considered, created, skipped };
}
