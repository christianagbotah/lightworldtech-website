-- Phase 8 newsletter delivery operations.
-- Additive and idempotent: creates only the delivery audit table and indexes.

PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS "NewsletterDelivery" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "subscriberId" TEXT,
  "recipient" TEXT NOT NULL,
  "kind" TEXT NOT NULL DEFAULT 'confirmation',
  "subject" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "transport" TEXT NOT NULL DEFAULT '',
  "error" TEXT NOT NULL DEFAULT '',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "NewsletterDelivery_subscriberId_fkey"
    FOREIGN KEY ("subscriberId") REFERENCES "NewsletterSubscriber" ("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "NewsletterDelivery_status_createdAt_idx"
  ON "NewsletterDelivery"("status","createdAt");

CREATE INDEX IF NOT EXISTS "NewsletterDelivery_recipient_createdAt_idx"
  ON "NewsletterDelivery"("recipient","createdAt");

CREATE INDEX IF NOT EXISTS "NewsletterDelivery_subscriberId_createdAt_idx"
  ON "NewsletterDelivery"("subscriberId","createdAt");
