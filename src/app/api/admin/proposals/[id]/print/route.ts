import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAdminSession } from '@/lib/admin-auth';

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function paragraphs(value: string): string {
  return escapeHtml(value)
    .split(/\n{2,}/)
    .map((part) => '<p>' + part.replaceAll('\n', '<br>') + '</p>')
    .join('');
}

function listBlock(value: string): string {
  const lines = value
    .split('\n')
    .map((line) => line.replace(/^\s*[-•]\s*/, '').trim())
    .filter(Boolean);

  if (lines.length === 0) return '<p>To be confirmed during human review.</p>';
  return '<ul>' + lines.map((line) => '<li>' + escapeHtml(line) + '</li>').join('') + '</ul>';
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = getAdminSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;

    const [proposal, settingsRows] = await Promise.all([
      db.proposalDraft.findUnique({
        where: { id },
        include: {
          lead: {
            include: { contactMessage: true },
          },
        },
      }),
      db.siteSetting.findMany({
        where: {
          key: {
            in: ['company_name', 'company_email', 'company_phone1', 'company_address', 'company_tagline'],
          },
        },
        select: { key: true, value: true },
      }),
    ]);

    if (!proposal) return NextResponse.json({ error: 'Proposal draft not found' }, { status: 404 });

    const settings = Object.fromEntries(settingsRows.map((row) => [row.key, row.value]));
    const companyName = settings.company_name || 'Lightworld Technologies Ltd';
    const companyEmail = settings.company_email || 'mail@lightworldtech.com';
    const companyPhone = settings.company_phone1 || '+233 24 361 8186';
    const companyAddress = settings.company_address || 'Accra, Ghana';
    const tagline = settings.company_tagline || 'The world of possibilities';
    const contact = proposal.lead.contactMessage;

    const approved = proposal.status === 'approved';
    const statusLabel = approved
      ? 'APPROVED PROPOSAL'
      : proposal.status === 'archived'
        ? 'ARCHIVED DRAFT'
        : 'DRAFT — HUMAN REVIEW REQUIRED';

    const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(proposal.title)} · v${proposal.version}</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin: 0; background: #eef2f0; color: #111827; font-family: Arial, Helvetica, sans-serif; line-height: 1.55; }
  .toolbar { position: sticky; top: 0; z-index: 10; display: flex; justify-content: space-between; gap: 12px; align-items: center; padding: 12px 20px; background: #07100f; color: white; }
  .toolbar button { border: 0; border-radius: 999px; padding: 10px 16px; font-weight: 700; cursor: pointer; background: #34d399; color: #06231b; }
  .page { width: min(900px, calc(100% - 32px)); margin: 28px auto; background: white; padding: 52px 58px; box-shadow: 0 10px 40px rgba(15,23,42,.08); }
  .brand { display: flex; justify-content: space-between; gap: 24px; align-items: flex-start; padding-bottom: 24px; border-bottom: 1px solid #e5e7eb; }
  .brand h1 { margin: 0; font-size: 20px; }
  .brand .tagline { margin-top: 4px; color: #059669; font-size: 11px; text-transform: uppercase; letter-spacing: .14em; font-weight: 700; }
  .meta { text-align: right; font-size: 11px; color: #6b7280; }
  .status { display: inline-block; margin-top: 28px; border-radius: 999px; padding: 7px 11px; font-size: 10px; letter-spacing: .12em; font-weight: 800; background: ${approved ? '#d1fae5' : '#fef3c7'}; color: ${approved ? '#065f46' : '#92400e'}; }
  .title { margin: 18px 0 6px; font-size: 34px; line-height: 1.08; letter-spacing: -.025em; }
  .recipient { margin: 0; color: #6b7280; font-size: 13px; }
  .warning { margin: 26px 0; padding: 16px 18px; border-left: 4px solid ${approved ? '#10b981' : '#f59e0b'}; background: ${approved ? '#ecfdf5' : '#fffbeb'}; font-size: 12px; }
  section { margin-top: 32px; }
  section h2 { margin: 0 0 12px; font-size: 18px; letter-spacing: -.01em; }
  section p { margin: 0 0 10px; font-size: 13px; color: #374151; }
  ul { margin: 8px 0 0; padding-left: 20px; }
  li { margin: 8px 0; font-size: 13px; color: #374151; }
  .commercial { border: 1px solid #d1fae5; background: #f0fdf4; padding: 20px; border-radius: 16px; }
  .approval { margin-top: 34px; padding-top: 18px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #6b7280; }
  .footer { margin-top: 42px; padding-top: 18px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; gap: 20px; color: #6b7280; font-size: 10px; }
  @media print {
    body { background: white; }
    .toolbar { display: none; }
    .page { width: 100%; margin: 0; box-shadow: none; padding: 24mm 18mm; }
    section { break-inside: avoid; }
  }
</style>
</head>
<body>
<div class="toolbar">
  <span>Lightworld Proposal · v${proposal.version}</span>
  <button onclick="window.print()">Print / Save PDF</button>
</div>
<main class="page">
  <header class="brand">
    <div>
      <h1>${escapeHtml(companyName)}</h1>
      <div class="tagline">${escapeHtml(tagline)}</div>
    </div>
    <div class="meta">
      ${escapeHtml(companyAddress)}<br>
      ${escapeHtml(companyEmail)}<br>
      ${escapeHtml(companyPhone)}
    </div>
  </header>

  <span class="status">${statusLabel}</span>
  <h1 class="title">${escapeHtml(proposal.title)}</h1>
  <p class="recipient">Prepared for ${escapeHtml(contact.name)} · Version ${proposal.version}</p>

  <div class="warning">
    ${
      approved
        ? 'This version was approved by ' + escapeHtml(proposal.approvedBy || 'an authorized Lightworld reviewer') +
          (proposal.approvedAt ? ' on ' + escapeHtml(proposal.approvedAt.toISOString().slice(0, 10)) : '') + '.'
        : 'This is an internal working draft. Pricing, delivery commitments and contractual terms require explicit human review before external issue.'
    }
  </div>

  <section><h2>Executive summary</h2>${paragraphs(proposal.executiveSummary)}</section>
  <section><h2>Problem statement</h2>${paragraphs(proposal.problemStatement)}</section>
  <section><h2>Proposed solution</h2>${paragraphs(proposal.proposedSolution)}</section>
  <section><h2>Relevant capabilities</h2>${listBlock(proposal.capabilities)}</section>
  <section><h2>Delivery approach</h2>${listBlock(proposal.phases)}</section>
  <section><h2>Assumptions</h2>${listBlock(proposal.assumptions)}</section>
  <section><h2>Exclusions & boundaries</h2>${listBlock(proposal.exclusions)}</section>
  <section><h2>Discovery questions</h2>${listBlock(proposal.discoveryQuestions)}</section>
  <section><h2>Next steps</h2>${listBlock(proposal.nextSteps)}</section>

  ${
    proposal.commercialNotes.trim()
      ? '<section class="commercial"><h2>Commercial terms & reviewer notes</h2>' + paragraphs(proposal.commercialNotes) + '</section>'
      : ''
  }

  <div class="approval">
    Status: ${escapeHtml(proposal.status)} · Created by ${escapeHtml(proposal.createdBy)} · Last updated ${escapeHtml(proposal.updatedAt.toISOString().slice(0, 10))}
  </div>

  <footer class="footer">
    <span>${escapeHtml(companyName)}</span>
    <span>${escapeHtml(companyEmail)} · ${escapeHtml(companyPhone)}</span>
  </footer>
</main>
</body>
</html>`;

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Robots-Tag': 'noindex, nofollow',
        'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'self'",
      },
    });
  } catch (error) {
    console.error('Error rendering proposal print view:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to render proposal' },
      { status: 500 },
    );
  }
}
