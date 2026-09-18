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
