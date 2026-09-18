import { Database } from 'bun:sqlite';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';

const sourcePath = process.env.SQLITE_SOURCE_PATH;
const destinationUrl = process.env.DATABASE_URL || '';

if (!sourcePath || !existsSync(sourcePath)) {
  throw new Error('SQLITE_SOURCE_PATH must point to the source SQLite database');
}

if (!/^postgres(ql)?:\/\//i.test(destinationUrl)) {
  throw new Error('DATABASE_URL must be a PostgreSQL URL. Refusing to run.');
}

const source = new Database(sourcePath, { readonly: true, strict: true });
const destination = new PrismaClient();

type Row = Record<string, unknown>;

type TablePlan = {
  table: string;
  delegate: keyof PrismaClient;
  booleans?: string[];
  dates?: string[];
  deferFields?: string[];
};

const plans: TablePlan[] = [
  { table: 'SiteSetting', delegate: 'siteSetting', dates: ['createdAt', 'updatedAt'] },
  { table: 'NavItem', delegate: 'navItem', booleans: ['active'], dates: ['createdAt', 'updatedAt'], deferFields: ['parentId'] },
  { table: 'Service', delegate: 'service', booleans: ['active'], dates: ['createdAt', 'updatedAt'] },
  { table: 'TeamMember', delegate: 'teamMember', booleans: ['active'], dates: ['createdAt', 'updatedAt'] },
  { table: 'Testimonial', delegate: 'testimonial', booleans: ['active'], dates: ['createdAt', 'updatedAt'] },
  { table: 'BlogCategory', delegate: 'blogCategory', dates: ['createdAt', 'updatedAt'] },
  { table: 'BlogPost', delegate: 'blogPost', booleans: ['published', 'featured'], dates: ['createdAt', 'updatedAt'] },
  { table: 'PortfolioProject', delegate: 'portfolioProject', booleans: ['featured', 'active'], dates: ['createdAt', 'updatedAt'] },
  { table: 'Client', delegate: 'client', booleans: ['active'], dates: ['createdAt', 'updatedAt'] },
  { table: 'ContactMessage', delegate: 'contactMessage', booleans: ['read'], dates: ['createdAt', 'updatedAt'] },
  { table: 'NewsletterSubscriber', delegate: 'newsletterSubscriber', booleans: ['active'], dates: ['createdAt'] },
  { table: 'FAQ', delegate: 'fAQ', booleans: ['active'], dates: ['createdAt', 'updatedAt'] },
  { table: 'ProcessStep', delegate: 'processStep', booleans: ['active'], dates: ['createdAt', 'updatedAt'] },
  { table: 'Admin', delegate: 'admin', booleans: ['active'], dates: ['lastLogin', 'createdAt', 'updatedAt'] },
  { table: 'AnalyticsEvent', delegate: 'analyticsEvent', dates: ['createdAt'] },
  { table: 'Lead', delegate: 'lead', dates: ['nextFollowUp', 'lastContactedAt', 'createdAt', 'updatedAt'] },
  { table: 'LeadNote', delegate: 'leadNote', dates: ['createdAt'] },
];

function tableExists(table: string): boolean {
  const row = source.query("SELECT name FROM sqlite_master WHERE type='table' AND name = ?").get(table) as { name?: string } | null;
  return Boolean(row?.name);
}

function toDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) return value;
  if (typeof value === 'number') {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date;
  }
  if (typeof value === 'string') {
    const numeric = Number(value);
    const date = Number.isFinite(numeric) && /^\d+$/.test(value) ? new Date(numeric) : new Date(value);
    if (!Number.isNaN(date.getTime())) return date;
  }
  throw new Error('Cannot convert SQLite date value: ' + String(value));
}

function transform(plan: TablePlan, raw: Row): Row {
  const row: Row = { ...raw };

  for (const field of plan.booleans || []) {
    if (field in row) row[field] = Boolean(row[field]);
  }

  for (const field of plan.dates || []) {
    if (field in row) row[field] = toDate(row[field]);
  }

  return row;
}

function withoutDeferred(plan: TablePlan, row: Row): Row {
  const copy = { ...row };
  for (const field of plan.deferFields || []) {
    copy[field] = null;
  }
  return copy;
}

function canonicalValue(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, current]) => [key, canonicalValue(current)]),
    );
  }
  return value;
}

function digest(rows: Row[]): string {
  const normalized = rows
    .map((row) => canonicalValue(row) as Record<string, unknown>)
    .sort((a, b) => String(a.id || '').localeCompare(String(b.id || '')));
  return createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
}

function sourceRows(plan: TablePlan): Row[] {
  if (!tableExists(plan.table)) return [];
  return (source.query('SELECT * FROM "' + plan.table + '"').all() as Row[]).map((row) => transform(plan, row));
}

function delegateFor(plan: TablePlan): any {
  const delegate = (destination as any)[plan.delegate];
  if (!delegate) throw new Error('Missing Prisma delegate for ' + String(plan.delegate));
  return delegate;
}

async function assertDestinationEmpty() {
  if (process.env.ALLOW_DESTINATION_DATA === '1') return;

  const populated: string[] = [];
  for (const plan of plans) {
    const count = await delegateFor(plan).count();
    if (count > 0) populated.push(plan.table + '=' + count);
  }
  if (populated.length) {
    throw new Error(
      'Destination contains business data (' + populated.join(', ') +
      '). Refusing initial copy. Set ALLOW_DESTINATION_DATA=1 only for an intentional idempotent resync.',
    );
  }
}

async function upsertRows(plan: TablePlan, rows: Row[]) {
  if (!rows.length) return;
  const delegate = delegateFor(plan);

  for (const row of rows) {
    const data = withoutDeferred(plan, row);
    await delegate.upsert({
      where: { id: String(row.id) },
      create: data,
      update: data,
    });
  }

  if (plan.deferFields?.length) {
    for (const row of rows) {
      const updates: Row = {};
      for (const field of plan.deferFields) {
        updates[field] = row[field] ?? null;
      }
      // Prisma's @updatedAt changes on relationship updates. Preserve the
      // source timestamp explicitly so verification remains lossless.
      if (row.updatedAt instanceof Date) updates.updatedAt = row.updatedAt;
      await delegate.update({ where: { id: String(row.id) }, data: updates });
    }
  }
}

async function verifyPlan(plan: TablePlan) {
  const src = sourceRows(plan);
  const dst = (await delegateFor(plan).findMany()) as Row[];

  const srcDigest = digest(src);
  const dstDigest = digest(dst);

  if (src.length !== dst.length || srcDigest !== dstDigest) {
    throw new Error(
      plan.table + ' verification failed: source=' + src.length +
      ' destination=' + dst.length +
      ' sourceDigest=' + srcDigest +
      ' destinationDigest=' + dstDigest,
    );
  }

  console.log(
    'VERIFIED ' + plan.table +
    ' rows=' + src.length +
    ' sha256=' + srcDigest.slice(0, 16),
  );
}

async function main() {
  console.log('SQLite source:', sourcePath);
  console.log('PostgreSQL destination confirmed.');
  await assertDestinationEmpty();

  for (const plan of plans) {
    const rows = sourceRows(plan);
    await upsertRows(plan, rows);
    console.log('COPIED ' + plan.table + ' rows=' + rows.length);
  }

  for (const plan of plans) {
    await verifyPlan(plan);
  }

  const company = await destination.siteSetting.findUnique({ where: { key: 'company_name' } });
  if (company?.value !== 'Lightworld Technologies Ltd') {
    throw new Error('Canonical company name verification failed');
  }

  const admin = await destination.admin.findFirst({ where: { active: true } });
  if (!admin || !admin.password.startsWith('scrypt$')) {
    throw new Error('Active admin/password hash verification failed');
  }

  const leadership = await destination.teamMember.findMany({
    where: { active: true, name: { in: ['Christian Agbotah', 'Rober Yaw Essuon'] } },
    select: { name: true },
  });
  if (leadership.length !== 2) {
    throw new Error('Canonical leadership verification failed');
  }

  console.log('CRITICAL_FACTS_OK=1');
  console.log('MIGRATION_VERIFIED=1');
}

main()
  .finally(async () => {
    source.close();
    await destination.$disconnect();
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
