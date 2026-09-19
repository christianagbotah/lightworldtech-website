# Production deployment notes

This document captures the production requirements for the Lightworld Technologies website.

## Database

Production uses PostgreSQL through Prisma. SQLite was the legacy store and is retained only as a rollback/source artifact during the PostgreSQL cutover.

Required environment:

- `DATABASE_URL` — PostgreSQL connection URL used by Prisma.
- `ADMIN_SESSION_SECRET` — high-entropy secret used to sign the HttpOnly admin session cookie. `NEXTAUTH_SECRET` is accepted as a fallback.
- `ADMIN_SEED_PASSWORD` — required only when intentionally running `prisma/seed.ts`.

Do not commit database credentials or admin secrets.

## Database deployment

Every release must use committed Prisma migrations:

```bash
bun install --frozen-lockfile
bunx prisma generate
bun run db:migrate:deploy
bun run db:migrate:status
bun run build
```

Do not use `prisma db push` in production.

The files `prisma/phase3-analytics.sql` and `prisma/phase4-crm.sql` are legacy SQLite-era rollout artifacts. They are not part of the PostgreSQL production deployment path.

## SQLite to PostgreSQL cutover

The migration utility preserves IDs, timestamps, boolean fields, hashes and relationships, and verifies each migrated table using row counts plus normalized SHA-256 digests.

Initial copy:

```bash
DATABASE_URL="<postgres-url>" \
SQLITE_SOURCE_PATH="/path/to/custom.db" \
bun run db:copy:sqlite-to-postgres
```

The utility refuses a resync if PostgreSQL contains record IDs that are not present in the SQLite source. A final sync should be run immediately before cutover.

Cutover procedure:

1. Back up the SQLite database and shared environment file.
2. Create a PostgreSQL `pg_dump`.
3. Run `bun run db:migrate:deploy` and verify status.
4. Run the SQLite-to-PostgreSQL copy again and require `MIGRATION_VERIFIED=1`.
5. Verify canonical company identity, active admin hash, leadership and CMS counts.
6. Start the exact release on the candidate port with the PostgreSQL URL.
7. Smoke-test public routes, admin protection, CMS reads, analytics and concierge.
8. Replace only `DATABASE_URL` in the shared production environment.
9. Switch traffic using the normal blue/green procedure.
10. Keep the SQLite source and its backups intact until PostgreSQL has been stable through the agreed rollback window.

Rollback is to restore the previous shared environment file containing the SQLite URL and restart the last SQLite-compatible production release. Do not delete the SQLite file during the cutover.

## Admin authentication

- Admin sessions use an HttpOnly, SameSite=Lax cookie and expire after eight hours.
- Seeded passwords use scrypt.
- Legacy plain-text credentials are upgraded after a successful migration login.
- CMS mutations, dashboard statistics, private contact messages, drafts, inactive managed records and configuration APIs require a valid signed admin session.

## Build verification

The GitHub `Website Quality Gate` must pass before merging. It:

1. starts PostgreSQL 18,
2. installs locked Bun dependencies,
3. generates the Prisma client,
4. applies committed migrations,
5. verifies migration status,
6. runs TypeScript verification,
7. runs security/deterministic intelligence tests,
8. builds the production Next.js application.

## Smoke checks after deployment

Verify:

- `/`, `/services`, `/portfolio`, `/products`, `/blog`, `/careers`, `/contact`, `/privacy`, `/terms`
- `/sitemap.xml`, `/robots.txt`, `/manifest.webmanifest`
- public contact and newsletter submissions
- assistant company/leadership/service answers and project-scope handoff
- `/admin` login, refresh with active session and logout
- admin CRUD for CMS content
- admin analytics remains protected
- draft/inactive records are not visible to unauthenticated APIs
- PM2 remains online with zero unstable restarts

## Phase 4 CRM deployment

Phase 4 adds the additive `Lead` and `LeadNote` tables used by the admin CRM. Before switching production traffic, back up the SQLite database and run:

```bash
bun run db:phase4
```

The script creates only the CRM tables and indexes when they are missing. Existing `ContactMessage` rows are left unchanged; the CRM API lazily creates linked lead records for historical enquiries when the admin opens the CRM.
