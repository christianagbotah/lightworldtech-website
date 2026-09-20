# Production deployment notes

This document captures the minimum production requirements for the Lightworld Technologies website.

## Required environment

- `DATABASE_URL` — PostgreSQL production connection used by Prisma. Production uses the dedicated `lightworld_website_db` / `lightworld_website_user` pair over the local Unix socket; no database password is stored in the application environment.
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
- `UPLOAD_DIR` — persistent filesystem location for CMS uploads. Production must point this outside immutable release directories, for example `/home/lightworld/shared/lightworldtech/uploads`.

Generate the session secret with a cryptographically secure random generator and keep it outside the repository.

## Admin authentication

- Admin sessions are stored in an HttpOnly, SameSite=Lax cookie and expire after eight hours.
- Newly seeded admin passwords are stored using scrypt.
- Legacy plain-text admin passwords are accepted only for a successful migration login and are immediately upgraded to scrypt.
- CMS mutations, dashboard statistics, private contact messages, drafts, inactive managed records, and configuration APIs require a valid signed admin session.

## Build verification

The GitHub `Website Quality Gate` must pass before merging:

1. production operations shell syntax validation
2. locked Bun dependency install
3. Prisma client generation
4. PostgreSQL migration deployment against the CI database
5. TypeScript verification with `tsc --noEmit`
6. security and deterministic regression tests
7. Next.js production build

The production Next.js configuration does not ignore TypeScript build failures.

## Production release and promotion sequence

Production runs the website as the dedicated Linux user `lightworld` under `pm2-lightworld.service`. Do not deploy it through root's PM2 home.

Build each GitHub SHA into an immutable release directory:

```bash
SHA=<verified-main-sha>
STAMP=$(date -u +%Y%m%d-%H%M%S)
REL=/home/lightworld/releases/lightworldtech-${SHA:0:12}-${STAMP}

git clone https://github.com/christianagbotah/lightworldtech-website.git "$REL"
cd "$REL"
git checkout "$SHA"
ln -sfn /home/lightworld/shared/lightworldtech/.env .env

bun install --frozen-lockfile
bunx prisma generate
bun run db:deploy
bun run build

ln -sfn /home/lightworld/shared/lightworldtech/.env .next/standalone/.env
printf '%s\n' "$SHA" > .next/standalone/RELEASE_SHA
```

Install/update the version-controlled production operations scripts when they change:

```bash
cd "$REL"
sudo ./ops/install-production-ops.sh
```

Promote only through the shared promotion script:

```bash
sudo /home/lightworld/shared/lightworldtech/ops/promote-release.sh "$REL"
```

Promotion is serialized with an exclusive lock. Before port 3007 is touched, the release is started as `lightworld` on port 3017 and must pass route, unauthenticated admin/client-auth, and upload-boundary smoke checks. The verified previous live release is then protected by `/home/lightworld/webapps/lightworldtech-previous`. If the live switch or post-switch smoke checks fail, the script restores the previous release.

The release-pruning job uses the same lock, so pruning cannot race a promotion. It preserves the current symlink target, rollback symlink target, any release whose working directory is still in use, and releases younger than the configured minimum age.

If production seeding is explicitly required:

```bash
ADMIN_SEED_PASSWORD="<secure-value>" bunx prisma db seed
```

Do not use the development fallback password in production.

## Smoke checks after deployment

Verify:

- `/`, `/services`, `/portfolio`, `/products`, `/blog`, `/careers`, and `/contact`
- `/sitemap.xml`, `/robots.txt`, and `/manifest.webmanifest`
- page source/meta inspection for canonical URL, Open Graph/Twitter image, organization JSON-LD and configured Google/Bing verification tags
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


## Phase 11 SEO and brand discovery

Phase 11 does not require a database schema migration. It turns the existing `SiteSetting` records into the source of truth for global brand discovery and page-level SEO.

Manage these values from **Admin → Settings → SEO & Brand Discovery / Page SEO**. The implementation now drives:

- canonical site origin used by global metadata, sitemap and robots output;
- default title, description and keyword metadata;
- Open Graph and Twitter/X large-image previews;
- default organization logo and social-preview image;
- Google and Bing site-verification metadata;
- organization/WebSite JSON-LD identity, contact and social-profile fields;
- page-level metadata for Home, Services, About, Portfolio, Products, Contact, Team, Careers, Trust Center, Newsroom and Blog;
- article metadata and publisher JSON-LD for published blog posts, including fallback social imagery.

Keep `seo_site_url` as the production canonical origin including `https://`, for example `https://www.lightworldtech.com`. Invalid or missing values fall back safely to the verified production origin. If the CMS database is temporarily unavailable, public metadata also falls back to built-in verified values rather than failing the site.

After deployment, save one harmless SEO-field change in a non-production/UAT environment and verify the rendered `<head>`, `/sitemap.xml`, `/robots.txt`, a social-preview debugger, and one published blog article before changing production search-verification tokens.


## Phase 14 PostgreSQL production baseline

Phase 14 moves the website from SQLite to PostgreSQL. PostgreSQL is now the canonical production datastore for CMS, CRM, client portal, newsletter/campaign, analytics and admin-governance data.

Production uses the dedicated database `lightworld_website_db` and role `lightworld_website_user` over the local PostgreSQL Unix socket. The VPS maps the dedicated `lightworld` application user to that database role with a database-specific peer-auth rule, avoiding a stored database password. The root mapping remains available only for controlled maintenance operations.

The migration history starts at `20260919170000_postgresql_baseline`. Existing production PostgreSQL schema is baselined once with `prisma migrate resolve --applied 20260919170000_postgresql_baseline`; subsequent releases use:

```bash
bun run db:deploy
```

The old `db:phase3` through `db:phase13` scripts are retained only as historical/legacy SQLite upgrade material. **Do not run them against PostgreSQL.**

Before the one-time cutover, preserve both the final SQLite file and a PostgreSQL custom-format dump. Validate all table counts, primary IDs and row content before switching the production `DATABASE_URL`. Keep the final SQLite database as a rollback artifact until PostgreSQL operation is proven stable.


## Phase 15 persistent CMS uploads

Production uploads must never be written into an immutable release directory. Configure:

```bash
UPLOAD_DIR=/home/lightworld/shared/lightworldtech/uploads
```

The admin image upload API accepts only authenticated administrator requests, enforces a 5 MB maximum, validates JPG/PNG/GIF/WebP from file signatures, generates random filenames, and stores the bytes in `UPLOAD_DIR`. Uploaded images are served through `/uploads/<random-filename>` with a strict filename allowlist, explicit content type, `nosniff`, and immutable caching.

Create the shared directory before switching a release:

```bash
install -d -m 0750 /home/lightworld/shared/lightworldtech/uploads
```

Do not restore the old `public/uploads` release-local write pattern. Files under `UPLOAD_DIR` survive release pruning and normal deployments.


## Phase 20 deployment safety and dedicated runtime

Production deployment operations are version-controlled under `ops/` and installed into `/home/lightworld/shared/lightworldtech/ops`.

Operational invariants:

- the web process runs as the dedicated `lightworld` Linux user under `pm2-lightworld.service`;
- root's PM2 home must not be used for the website;
- `prepare-release-runtime.sh` verifies that `lightworld` can read the protected shared environment and write both the Next.js image cache and persistent upload directory;
- `promote-release.sh` uses an exclusive deployment lock and proves a candidate on port 3017 before stopping the verified live server on port 3007;
- the current release is captured as the rollback target before the live switch;
- failed live promotion restores the verified previous release;
- `prune-releases.sh` uses the same lock and cannot delete releases while a promotion is in progress;
- release pruning never removes the current release, the rollback release, an in-use release, or a release younger than the configured minimum age;
- `RELEASE_SHA` must identify the exact GitHub commit in every promoted standalone artifact.

Service checks:

```bash
systemctl is-active pm2-lightworld.service
sudo -u lightworld -H sh -lc 'cd /; pm2 describe lightworldtech'
readlink -f /home/lightworld/webapps/lightworldtech
cat /home/lightworld/webapps/lightworldtech/.next/standalone/RELEASE_SHA
```

After promotion, public `/admin` must remain `private, no-store`; unauthenticated `/api/admin/auth`, `/api/client/auth`, and `/api/upload` must return 401.


## Phase 22 live administrator session revalidation

Protected administrator APIs must not treat a validly signed cookie as sufficient authorization on its own. Before protected data is returned or mutated, the request revalidates the administrator against the live `Admin` row and requires the account to remain active with matching email, role and `authVersion`.

This closes the remaining cookie-only authorization paths in proposal editing, CRM notes, client-support replies and proposal-to-client conversion. Deactivation, role changes, email changes and password/governance actions that advance `authVersion` therefore invalidate access on the next protected request rather than waiting for the eight-hour cookie lifetime to expire.

The regression suite enforces two invariants:

- admin mutation handlers must use `await isAdminRequest(request)`, a checked `await getActiveAdminContext(request)`, or a checked `await getSuperAdminContext(request)`;
- protected admin route files outside the intentional public login/password-recovery entrypoints may not call `getAdminSession(request)` directly.

No database migration is required for Phase 22.


## Phase 23 fine-grained administrator permissions

Administrator access is now split into explicit capability areas rather than treating every ordinary admin as a full back-office operator:

- `site.manage` — page content, settings, services, blog, team, testimonials, portfolio, FAQs and CMS uploads;
- `crm.manage` — enquiries, CRM pipeline, follow-ups, messages and lead notes;
- `proposals.manage` — proposal creation, review and editing;
- `clients.manage` — client organizations, users, projects, documents, milestones, announcements and support;
- `communications.manage` — newsletter subscribers, diagnostics and campaign management.

Super-admins always have all capabilities. Existing ordinary administrators are backfilled with all five permissions by the PostgreSQL migration so Phase 23 is non-breaking; a super-admin can then reduce access deliberately in Admin Governance.

Authorization is enforced against the live `Admin.permissions` value on protected API requests, not only by hiding sidebar links. Cross-module actions follow the same rule: CRM users without proposal access do not see proposal actions, and proposal users without Client Portal access do not see client-conversion controls. Dashboard queries and widgets are permission-scoped to avoid exposing data from modules an administrator cannot access.

Changing an ordinary administrator's permission set increments `authVersion`, invalidating the target account's existing session. Permission assignments and changes are included in the governance audit trail.

Deploy Phase 23 only after the PostgreSQL migration has been applied with:

```bash
bun run db:deploy
```


## Phase 24 CMS-complete shared navigation

The Global & Navigation CMS group now controls the live shared navigation and footer chrome rather than only the top-level desktop links.

Managed surfaces include:

- desktop Services mega-menu entries, descriptions, destinations and supported icon keys;
- desktop Company menu entries, descriptions, destinations and supported icon keys;
- Services and Company group labels and landing links;
- the header call-to-action label and destination;
- mobile Explore navigation, derived from the managed primary and Company menus so desktop/mobile stay consistent;
- mobile capability cards, derived from the managed Services menu;
- the four-item mobile quick dock;
- footer Build, Explore and Connect links;
- footer headline, newsletter copy and closing CTA.

Managed navigation destinations are normalized before rendering. Internal paths and explicit `http:`, `https:`, `mailto:` and `tel:` links are allowed. Executable schemes such as `javascript:`, protocol-relative links and control-character input fall back to a safe local destination.

No database migration or environment-variable change is required for Phase 24. Existing sites continue to use the current navigation as defaults until an administrator saves customized values.


## Phase 25 full-site CMS completion for Insights and legal pages

The Page Content CMS now controls the live public copy for three previously incomplete areas:

- Insights / Blog landing page hero, search placeholder and empty-state messaging;
- Privacy & Cookie Notice hero, last-updated line, regulator information, section content and privacy-request block;
- Website Terms hero, last-updated line and section content.

The Page SEO group now exposes the settings already consumed by the Insights page and adds editable Privacy and Terms search metadata. Current public wording remains the default fallback, so deploying Phase 25 does not change legal copy unless an administrator deliberately edits and saves the new CMS fields.

PublicShell can reuse settings already loaded by a page, avoiding duplicate SiteSetting queries on Insights, Privacy and Terms.

Phase 25 does not require a database migration. The existing SiteSetting model stores the new keys on first save. Legal-content changes should be reviewed carefully before publication.


## Phase 26 live search, managed contact consistency and outbound-link safety

The public command palette now searches current published website content instead of shipping a static demo index. Navigation entries come from the CMS-managed header/company settings, while services, insights, portfolio projects and FAQs are loaded from the existing public APIs only when the palette is opened. The server's existing public filtering continues to exclude inactive services/portfolio/FAQs and unpublished blog posts.

The floating WhatsApp and assistant widgets now reuse managed company settings for company name, email, primary phone and a dedicated `company_whatsapp` number. Ghana local and `+233` display formats are normalized before generating the WhatsApp destination, including legacy formatted values such as `+233 (024) ...`.

Assistant-generated CTA destinations, managed portfolio project URLs and managed footer social links are normalized through the shared safe-navigation policy before rendering. Executable URL schemes therefore fall back or disappear rather than being emitted as clickable links.

Phase 26 requires no database migration. The new `company_whatsapp` setting is stored by the existing SiteSetting model when first saved.


## Phase 27 consent CMS alignment and privacy hardening

The cookie/privacy control now reuses the managed legal-content settings instead of carrying a separate hard-coded privacy message. Administrators can edit the consent title, description, privacy-link label, action labels and the currently active Essential/Analytics category descriptions from Page Content → Privacy & Website Terms.

Consent state is normalized through a shared helper before it is stored or read. Essential storage is always enabled. Analytics remains disabled unless the visitor explicitly accepts it. Marketing and other inactive optional categories are forced off, including legacy browser values, so the current website does not pre-consent a visitor to future integrations that are not yet present.

The analytics client consumes the same normalized consent state. The cookie-settings control is also moved above the mobile navigation dock on smaller screens so it remains accessible without overlapping primary navigation.

Phase 27 requires no database migration. The new copy settings use the existing SiteSetting store on first save.
