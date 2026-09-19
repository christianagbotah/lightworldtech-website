# Production deployment notes

This document captures the minimum production requirements for the Lightworld Technologies website.

## Required environment

- `DATABASE_URL` — production database connection used by Prisma.
- `ADMIN_SESSION_SECRET` — high-entropy secret used to sign the HttpOnly admin session cookie. A `NEXTAUTH_SECRET` value is accepted as a fallback, but `ADMIN_SESSION_SECRET` is preferred for clarity.
- `ADMIN_SEED_PASSWORD` — required only when running `prisma/seed.ts` in production.
- `CLIENT_SESSION_SECRET` — recommended separate high-entropy secret for client portal sessions. If omitted, the portal falls back to `ADMIN_SESSION_SECRET` but uses a distinct signed namespace and cookie.
- `MAIL_TRANSPORT` — use `smtp` in production when an authenticated relay is configured. `auto` uses SMTP when `SMTP_HOST` is present and otherwise falls back to local sendmail.
- `SMTP_HOST` / `SMTP_PORT` — authenticated relay endpoint. Port `587` with STARTTLS is recommended; port `465` is supported with implicit TLS.
- `SMTP_USER` / `SMTP_PASS` — relay credentials. Keep these outside the repository and deployment logs.
- `SMTP_SECURE` — set `true` for implicit TLS on port 465; leave `false` for port 587 so STARTTLS can be negotiated.
- `SMTP_REQUIRE_TLS` — defaults to `true` for non-implicit-TLS SMTP connections. Do not disable it when authentication is used.
- `MAIL_FROM` / `MAIL_REPLY_TO` — optional sender identity overrides. Defaults remain the Lightworld Technologies business mailbox.
- `NEWSLETTER_UNSUBSCRIBE_SECRET` — recommended dedicated high-entropy HMAC secret for signed unsubscribe links. If omitted, the application falls back to the admin/session secret.

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
bun run db:phase8
bun run db:phase9
bun run db:phase10
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
- `/admin` → `Newsletter & Mail`, including transport diagnostics and a test message to an address you control
- `/admin` → `Campaign Studio`: create a draft, send a test, mark it Ready, and verify a bounded batch in a non-production subscriber list
- a newsletter unsubscribe link and one-click unsubscribe POST with a test subscriber
- `/admin` login, page refresh with an active session, and logout
- `/admin` → `Admin Governance` is visible only to a super-admin; create a temporary admin, change its role/status, reset its password, and verify the audit trail
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

Phase 7 adds an empty-by-default client portal for real client organizations, portal users, projects, milestones and support tickets. Back up the production SQLite database before deployment, then run:

```bash
bun run db:phase7
```

The upgrade creates only new client-portal tables and indexes. It does not seed demo clients or alter existing CMS, CRM or proposal records.

Client sessions use the dedicated HttpOnly `lw_client_session` cookie and are cryptographically namespaced separately from admin sessions. Set a distinct `CLIENT_SESSION_SECRET` in production when possible. Every client data request revalidates the portal user and organization and scopes data by the signed session organization rather than by a client-supplied tenant identifier.

Smoke-check `/client`, unauthenticated client APIs (401), admin client APIs (401 without admin session), a provisioned client login in a non-production test database, project/milestone visibility, cross-organization isolation and support ticket creation before switching traffic.


## Phase 8 mail delivery operations

Phase 8 adds a delivery audit trail for newsletter confirmations and an authenticated SMTP relay transport. Back up the production SQLite database before deployment, then run:

```bash
bun run db:phase8
```

The schema upgrade creates only the `NewsletterDelivery` table and indexes. Existing newsletter subscribers are preserved.

The website can still use the local `/usr/sbin/sendmail` transport for compatibility, but that path depends on the VPS being permitted to deliver directly to recipient mail servers over outbound SMTP. The production server has previously timed out when attempting direct delivery to Gmail over port 25, so production should use a provider-approved authenticated smart host on port 587 or 465.

Example production relay configuration:

```bash
MAIL_TRANSPORT=smtp
SMTP_HOST=smtp.example-provider.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_REQUIRE_TLS=true
SMTP_USER=<relay-username>
SMTP_PASS=<relay-password>
MAIL_FROM="Lightworld Technologies <mail@lightworldtech.com>"
MAIL_REPLY_TO=mail@lightworldtech.com
```

Do not commit relay credentials. Configure them in the deployment environment or secret store. After deployment, open **Admin → Newsletter & Mail** and send a transport test to an address you control. A successful SMTP acceptance confirms that the application handed the message to the configured relay; final inbox placement still depends on the receiving provider and the sender domain's DNS/reputation configuration.

The admin screen intentionally exposes only non-secret transport metadata. SMTP passwords are never returned by the API. Failed confirmation attempts are recorded with bounded diagnostic text so newsletter subscriptions remain saved even when outbound mail is temporarily unavailable.


## Phase 9 newsletter campaign studio

Phase 9 adds an admin-only campaign authoring and delivery workspace plus signed unsubscribe preferences. Back up the production SQLite database before deployment, then run:

```bash
bun run db:phase9
```

The upgrade creates only `NewsletterCampaign` and `NewsletterCampaignDelivery` tables and indexes. Existing subscribers and Phase 8 delivery history remain unchanged.

Set a dedicated unsubscribe signing secret in production:

```bash
NEWSLETTER_UNSUBSCRIBE_SECRET=<high-entropy-random-secret>
NEXT_PUBLIC_SITE_URL=https://lightworldtech.com
```

Campaign safety rules are enforced server-side:

- live delivery can target only records already marked as active newsletter subscribers;
- arbitrary recipient addresses are accepted only for explicit admin test messages;
- campaigns must be manually moved from Draft to Ready before live delivery;
- once live delivery starts, campaign content becomes immutable;
- each request processes at most 10 subscribers and limits concurrent SMTP sends;
- failed recipients remain retryable while successfully sent recipients are idempotently skipped;
- stale in-progress records can be retried after 15 minutes;
- every live message contains a signed unsubscribe link plus `List-Unsubscribe` and `List-Unsubscribe-Post` one-click headers;
- campaign body text is HTML-escaped before email rendering.

The admin must continue pressing **Send next batch** until Remaining reaches zero. This is deliberate: the current website runtime does not assume a background queue or cron worker. It prevents a web request from silently becoming an unbounded bulk-mail job and makes delivery progress visible to the operator.

Before sending a real campaign, use a non-production/test subscriber list, verify the SMTP relay, send a campaign test to an address you control, confirm links and formatting, and verify that unsubscribe immediately makes that subscriber inactive.


## Phase 10 admin governance and audit

Phase 10 adds an administrator governance control plane and an append-only governance audit table. Back up the production SQLite database before deployment, then run:

```bash
bun run db:phase10
```

The migration creates only the `AdminAuditLog` table and indexes, then guarantees that the site has at least one active `super_admin`: if none exists, the oldest active administrator is promoted once.

Important deployment behavior: if the currently signed-in administrator is promoted by the migration, the role embedded in the existing signed cookie no longer matches the database. The next `/admin` session validation will reject that stale session. Sign in again to receive the new super-admin role claim.

Governance safeguards enforced server-side:

- only a live database-backed `super_admin` session may call administrator governance APIs;
- protected admin/CMS API requests revalidate the signed session against the live Admin row, so deactivation, email change or role change invalidates stale access on the next protected request;
- ordinary admins do not see the Admin Governance navigation item and cannot open the governance workspace through the client router;
- a super-admin cannot deactivate or demote their own account from the same session;
- a super-admin cannot change their own email from the same privileged session;
- no change may deactivate or demote the last active super-admin;
- administrator email addresses remain unique;
- administrator passwords are stored with the existing scrypt password hashing implementation;
- governance actions, successful logins and logouts are recorded in `AdminAuditLog`;
- password values are never returned by governance APIs or stored in audit details.

This release intentionally introduces only two administrator roles: `admin` and `super_admin`. It does not claim fine-grained per-feature RBAC for every CMS route yet. Existing ordinary admins retain the operating access they had before Phase 10, while super-admin-only account governance is separated and auditable.
