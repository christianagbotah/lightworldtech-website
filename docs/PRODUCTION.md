# Production deployment notes

This document captures the minimum production requirements for the Lightworld Technologies website.

## Required environment

- `DATABASE_URL` — production database connection used by Prisma.
- `ADMIN_SESSION_SECRET` — high-entropy secret used to sign the HttpOnly admin session cookie. A `NEXTAUTH_SECRET` value is accepted as a fallback, but `ADMIN_SESSION_SECRET` is preferred for clarity.
- `ADMIN_SEED_PASSWORD` — required only when running `prisma/seed.ts` in production.

Generate the session secret with a cryptographically secure random generator and keep it outside the repository.

## Admin authentication

- Admin sessions are stored in an HttpOnly, SameSite=Lax cookie and expire after eight hours.
- Newly seeded admin passwords are stored using scrypt.
- Legacy plain-text admin passwords are accepted only for a successful migration login and are immediately upgraded to scrypt.
- CMS mutations, dashboard statistics, private contact messages, drafts, inactive managed records, and configuration APIs require a valid signed admin session.

## Build verification

The GitHub `Website Quality Gate` must pass before merging:

1. locked Bun dependency install
2. Prisma client generation
3. TypeScript verification with `tsc --noEmit`
4. Next.js production build

The production Next.js configuration does not ignore TypeScript build failures.

## Suggested deployment sequence

```bash
bun install --frozen-lockfile
bunx prisma generate
# Apply the idempotent Phase 3 analytics table/index upgrade.
bun run db:phase3
bun run db:phase4
bun run db:phase6
bun run db:phase7
bun run build
```

If production seeding is explicitly required:

```bash
ADMIN_SEED_PASSWORD="<secure-value>" bunx prisma db seed
```

Do not use the development fallback password in production.

## Smoke checks after deployment

Verify:

- `/`, `/services`, `/portfolio`, `/products`, `/blog`, `/careers`, and `/contact`
- `/sitemap.xml`, `/robots.txt`, and `/manifest.webmanifest`
- public contact and newsletter submissions
- `/admin` login, page refresh with an active session, and logout
- admin CRUD for services, portfolio, blog, FAQs, team, and testimonials
- draft/inactive records are not visible to unauthenticated API requests
- contact-message APIs return 401 without an admin session

## Phase 3 analytics deployment

Phase 3 adds the `AnalyticsEvent` table for consented first-party analytics. The repository does not yet use a historical Prisma migration baseline, so production must run the explicit, idempotent schema command before switching traffic:

```bash
bun run db:phase3
```

The command only creates the analytics table and its indexes when missing. It does not alter existing CMS tables. Back up the production SQLite database before any schema-changing release.

Analytics collection deliberately does not persist raw IP addresses, email addresses, or user-agent fingerprints. Public analytics failures must never block the visitor experience, and admin analytics endpoints remain session-protected.

## Phase 4 CRM deployment

Phase 4 adds the additive `Lead` and `LeadNote` tables used by the admin CRM. Before switching production traffic, back up the SQLite database and run:

```bash
bun run db:phase4
```

The script creates only the CRM tables and indexes when they are missing. Existing `ContactMessage` rows are left unchanged; the CRM API lazily creates linked lead records for historical enquiries when the admin opens the CRM.

## Phase 6 proposal workspace deployment

Phase 6 adds the additive `Proposal` table used by the admin Proposal & Discovery Workspace. Back up the production SQLite database before deployment, then run:

```bash
bun run db:phase6
```

The assisted proposal generator is intentionally grounded in CRM lead/contact facts and known capability categories. It does not auto-generate prices, payment terms, certifications, client claims, or binding delivery commitments. A proposal remains internal working material until an authenticated admin explicitly moves it to the approved/ready state.

## Phase 7 client portal deployment

Phase 7 adds separate client-portal identities, projects, milestones, approved document links, support tickets/messages and client announcements. Back up the SQLite database before rollout, then run:

```bash
bun run db:phase7
```

The upgrade is additive and idempotent. Client accounts are admin-provisioned; there is no public registration route. Temporary passwords must be at least 12 characters, are stored only as scrypt hashes, and clients are forced to replace them before project/ticket data is returned. Configure a dedicated `CLIENT_SESSION_SECRET` in production when possible; the application can fall back to the existing server session secret while preserving token audience separation.
