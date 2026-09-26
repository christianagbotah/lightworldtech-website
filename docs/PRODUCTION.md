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

Production runs the website as the dedicated Linux user `lightworld` under the hardened `lightworldtech-app.service` systemd unit. PM2 is not used for the production website; the legacy `pm2-lightworld.service` must remain disabled to prevent two supervisors competing for port 3007.

### Preferred path: deploy the CI-built runtime artifact

Every successful **push to `main`** now does more than prove that the application builds. After migrations, TypeScript, regression tests and the Next.js production build succeed, CI:

1. writes the exact GitHub commit into `.next/standalone/RELEASE_SHA`;
2. starts that standalone runtime on port 3017 against the CI database;
3. smoke-checks public routes plus the unauthenticated admin/client/upload boundaries;
4. packages `.next/standalone`, the Prisma schema/migrations and exact production ops scripts;
5. records the exact Prisma CLI version used by the locked build;
6. creates a SHA-256 checksum; and
7. uploads the bundle as `lightworldtech-runtime-<40-char-main-sha>`.

This means the production VPS does **not** need to run `bun install` or `next build` for normal releases.

Download the GitHub Actions artifact ZIP for the exact green `main` SHA, then deploy it with:

```bash
SHA=<verified-main-sha>
sudo /home/lightworld/shared/lightworldtech/ops/deploy-release-artifact.sh \
  /path/to/lightworldtech-runtime-$SHA.zip \
  "$SHA"
```

The artifact deployer refuses malformed SHAs, verifies the transferred archive checksum, verifies the embedded `RELEASE_SHA`, synchronizes the exact version-controlled production ops scripts, applies only the repository's Prisma migrations using the CI-recorded Prisma version, and finally calls the normal candidate-first promotion script.

Promotion remains serialized with an exclusive lock. Before port 3007 is touched, the extracted release is started as `lightworld` in a transient systemd candidate unit on port 3017 and must pass route and authorization-boundary smoke checks. The verified previous live release is protected by `/home/lightworld/webapps/lightworldtech-previous`. If the live switch or post-switch smoke checks fail, promotion restores that rollback target.

### Break-glass fallback: rebuild a verified SHA on the VPS

Use the source-build path only when a CI artifact is unavailable and an urgent release is required:

```bash
SHA=<verified-main-sha>
STAMP=$(date -u +%Y%m%d-%H%M%S)
REL=/home/lightworld/releases/lightworldtech-${SHA:0:12}-$STAMP

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
sudo ./ops/install-production-ops.sh
sudo /home/lightworld/shared/lightworldtech/ops/promote-release.sh "$REL"
```

This fallback is intentionally not the default because compiling Next.js on the production VPS competes with live applications for CPU, RAM and swap.

The release-pruning job uses the same promotion lock, so pruning cannot race a promotion. It preserves the current symlink target, rollback symlink target, any release whose working directory is still in use, and releases younger than the configured minimum age.

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

Keep `seo_site_url` as the production canonical origin including `https://`, for example `https://lightworldtech.com`. Invalid or missing values fall back safely to the verified production origin. If the CMS database is temporarily unavailable, public metadata also falls back to built-in verified values rather than failing the site.

After deployment, save one harmless SEO-field change in a non-production/UAT environment and verify the rendered `<head>`, `/sitemap.xml`, `/robots.txt`, a social-preview debugger, and one published blog article before changing production search-verification tokens.

### Search Console and indexing operations

Production search operations use the apex property `https://lightworldtech.com`. The `www` host permanently redirects to the apex host and must not be configured as a competing canonical property.

From **Admin → Settings → SEO & Brand Discovery → Search visibility readiness**:

1. Open Google Search Console and add `https://lightworldtech.com` as a URL-prefix property, or verify the whole `lightworldtech.com` domain through DNS.
2. When using Google's HTML-tag method, copy only the verification token from the tag's `content` attribute into `seo_google_verification`. Never invent a token.
3. Save the SEO group and verify the token appears in rendered page metadata.
4. Submit `https://lightworldtech.com/sitemap.xml` in Search Console.
5. Inspect and request indexing for the homepage, `/about`, `/services`, `/services/software-development`, and `/services/it-training`.
6. Review Search Console Performance and Pages reports regularly. Treat those reports—not a manual incognito ranking check—as the source of truth for queries, impressions, clicks, indexed URLs and crawl problems.

Business Profile changes and website entity signals can take time to be recrawled. Do not repeatedly change titles or structured data solely because a same-day search result has not moved.


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

- the web process runs as the dedicated `lightworld` Linux user under `lightworldtech-app.service`;
- PM2 is not used for the production website, and `pm2-lightworld.service` remains disabled;
- `prepare-release-runtime.sh` verifies that `lightworld` can read the protected shared environment and write both the Next.js image cache and persistent upload directory;
- `promote-release.sh` uses an exclusive deployment lock and proves a transient systemd candidate on port 3017 before restarting the verified systemd live server on port 3007;
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
- `communications.manage` — newsletter subscribers, email campaigns, Hubtel SMS templates/campaigns/scheduling and OTP diagnostics;
- `finance.manage` — customer services, invoicing, receipts, Hubtel payment records, suppliers, expenses, debtors, creditors, cashflow and management P&L.

Super-admins always have all capabilities. Existing ordinary administrators are backfilled with the capability set by the PostgreSQL migration so Phase 23 is non-breaking; a super-admin can then reduce access deliberately in Admin Governance.

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


## Phase 27 CMS-managed cookie and privacy-consent surface

The public cookie-consent banner now reads its visible wording from the existing Page Content CMS instead of maintaining a second hard-coded privacy message. Administrators can manage the banner title, description, Privacy & Cookie Notice link label, action labels, category heading, "Always on" label, and each consent-category name/description alongside the main Privacy and Terms content.

The underlying consent behavior is unchanged: essential storage remains mandatory, optional categories remain separately controllable, and the existing `lw-cookie-consent` / `lw-cookie-preferences` browser keys continue to drive analytics consent.

The action row now wraps on narrow screens so Customize, Decline and Accept All remain usable without horizontal overflow.

Phase 27 requires no database migration. New cookie-copy keys use the existing SiteSetting store and retain today's public wording as defaults until explicitly edited in Admin.


## Hubtel payments, SMS, OTP and scheduling

The customer account and communications workspaces support Hubtel behind server-only environment configuration. Do not commit Hubtel Client IDs, Client Secrets, merchant identifiers or scheduler secrets.

Minimum programmable SMS configuration:

```bash
HUBTEL_SMS_CLIENT_ID=<programmable-sms-client-id>
HUBTEL_SMS_CLIENT_SECRET=<programmable-sms-client-secret>
HUBTEL_SMS_SENDER_ID=<approved-sender-id>
# Optional; the application defaults to Hubtel's current programmable SMS endpoint:
HUBTEL_SMS_URL=https://smsc.hubtel.com/v1/messages/send
HUBTEL_SMS_BATCH_SIZE=5
```

OTP configuration uses the credentials and endpoint URLs assigned in the Hubtel developer account:

```bash
HUBTEL_OTP_CLIENT_ID=<otp-client-id>
HUBTEL_OTP_CLIENT_SECRET=<otp-client-secret>
HUBTEL_OTP_SEND_URL=<hubtel-otp-send-endpoint>
HUBTEL_OTP_VERIFY_URL=<hubtel-otp-verify-endpoint>
```

Online Checkout/payment configuration:

```bash
HUBTEL_PAYMENT_CLIENT_ID=<payment-client-id>
HUBTEL_PAYMENT_CLIENT_SECRET=<payment-client-secret>
HUBTEL_MERCHANT_ACCOUNT_NUMBER=<merchant-account-number>
HUBTEL_CHECKOUT_INITIATE_URL=<hubtel-online-checkout-initiation-endpoint>
HUBTEL_TRANSACTION_STATUS_URL=<hubtel-transaction-status-endpoint>
PUBLIC_SITE_URL=https://lightworldtech.com
```

The checkout callback must be reachable publicly at:

```text
https://lightworldtech.com/api/payments/hubtel/callback
```

The callback body is never treated as sufficient proof of payment. The application re-checks the transaction through Hubtel's transaction-status API, validates the client reference, currency and expected amount, then records an idempotent `ClientPayment` and invoice allocation. Therefore the same verified receipt feeds the client statement, debtors and cashflow rather than maintaining a second payment ledger.

Scheduled SMS and campaigns use a protected local dispatcher:

```bash
SMS_CRON_SECRET=<high-entropy-random-secret>
```

Automatic client service renewal/expiry reminders are deliberately opt-in. To let the protected SMS timer queue reminders when a service enters its configured `renewalNoticeDays` window, set:

```bash
AUTO_SERVICE_RENEWAL_SMS=true
SERVICE_RENEWAL_SMS_BATCH_SIZE=10

# Project-level renewal reminders are separately opt-in.
AUTO_PROJECT_RENEWAL_SMS=true

# Draft-only renewal billing automation is separately opt-in.
AUTO_RENEWAL_DRAFT_INVOICES=true
RENEWAL_DRAFT_INVOICE_BATCH_SIZE=10
RENEWAL_DRAFT_INVOICE_DUE_DAYS=7

# Overdue invoice reminders are separately opt-in and bounded.
AUTO_COLLECTION_REMINDER_SMS=true
COLLECTION_REMINDER_SMS_BATCH_SIZE=10
COLLECTION_REMINDER_SMS_INTERVAL_DAYS=7
COLLECTION_REMINDER_SMS_MIN_DAYS_OVERDUE=1
PROJECT_RENEWAL_SMS_BATCH_SIZE=10
```

The service renewal scheduler is bounded to at most 50 new reminders per run, uses the `service_renewal` / `service_expired` templates, and will not automatically resend an identical reminder that was already queued, sent or delivered.

The project renewal scheduler is independently opt-in, is also bounded to at most 50 new reminders per run, and uses the `project_renewal` / `project_expired` templates. A project must have a next renewal date, positive renewal amount and client phone number before it can be queued. Project reminders respect the recorded `renewalNoticeDays` window. Neither scheduler creates invoices, charges customers, changes renewal dates, or renews services/projects by itself.

`ops/install-production-ops.sh` installs and enables `lightworld-sms-dispatch.timer`, which invokes the dispatcher approximately once per minute as the dedicated `lightworld` user. The runner sends only bounded batches and silently skips delivery when Hubtel SMS or the scheduler secret is not configured.

Verification commands:

```bash
systemctl is-enabled lightworld-sms-dispatch.timer
systemctl is-active lightworld-sms-dispatch.timer
systemctl list-timers lightworld-sms-dispatch.timer
journalctl -u lightworld-sms-dispatch.service -n 50 --no-pager
```

After adding real credentials, smoke-test in this order:

1. **Admin → SMS & OTP** shows Programmable SMS / OTP / Online Payments as ready only for configured products.
2. Send one SMS to an internal test number and confirm the Hubtel message/provider ID is recorded.
3. Schedule one SMS a few minutes ahead and confirm the systemd timer delivers it.
4. Create a small manual campaign, send one bounded batch, then test a scheduled campaign.
5. Send and verify an OTP to an internal test number.
6. In a test client account with a GHS invoice, choose **Pay with Hubtel**, complete checkout, return to the portal, and confirm a single receipt/allocation is created and the invoice balance is reduced.
7. Re-send/replay the same Hubtel callback and confirm no duplicate customer receipt is created.


### Automated collections reminders

When `AUTO_COLLECTION_REMINDER_SMS=true`, the protected SMS dispatcher also reviews overdue customer invoices with a remaining balance. It schedules at most `COLLECTION_REMINDER_SMS_BATCH_SIZE` reminders per run, defers customers with an unexpired promise-to-pay, skips invalid or missing phone numbers, and suppresses repeat copies of the same reminder for `COLLECTION_REMINDER_SMS_INTERVAL_DAYS` days. The default interval is seven days and the default minimum age is one day overdue.

Each automatic reminder uses the approved `payment_due` template and creates an auditable `FinanceCollectionActivity` entry linked to the SMS message. The reminder directs the customer to the secure Client Portal for account and payment options; it does not mark an invoice paid or alter the finance ledger.


### Contact lead notifications

Set `CONTACT_NOTIFICATION_EMAIL` to the internal mailbox that should receive immediate alerts for new public Contact / project-brief submissions. If omitted, the application falls back to `MAIL_REPLY_TO` when configured. Lead persistence and CRM creation are authoritative: a mail transport failure is logged but never rolls back or rejects a successfully stored customer enquiry.

```bash
CONTACT_NOTIFICATION_EMAIL=mail@lightworldtech.com
```


### Automated renewal invoice drafts

When `AUTO_RENEWAL_DRAFT_INVOICES=true`, the protected scheduler may prepare draft invoices for service accounts that are explicitly marked `autoRenew=true`, have a positive recurring amount, and are inside their configured renewal-notice window. Creation is bounded by `RENEWAL_DRAFT_INVOICE_BATCH_SIZE` and the same service/renewal-date duplicate guard used by manual renewal billing.

These invoices are **drafts only**. Automation never issues or emails them, never posts an accounting journal, never charges Hubtel, never changes a service renewal date, and never completes a renewal cycle. The generated draft uses the recurring service amount and deliberately sets tax treatment to `none` with a visible note requiring finance staff to confirm tax, scope, pricing and due date before issue. A system audit event is recorded for every generated draft.

`RENEWAL_DRAFT_INVOICE_DUE_DAYS` is used only when the recorded renewal date is already in the past; otherwise the draft due date is the recorded renewal date.
