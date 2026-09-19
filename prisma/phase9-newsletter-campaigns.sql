-- Phase 9 newsletter campaign studio.
-- Additive and idempotent: creates campaign and campaign-delivery tables only.

PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS "NewsletterCampaign" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "title" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "preheader" TEXT NOT NULL DEFAULT '',
  "body" TEXT NOT NULL,
  "ctaLabel" TEXT NOT NULL DEFAULT '',
  "ctaUrl" TEXT NOT NULL DEFAULT '',
  "status" TEXT NOT NULL DEFAULT 'draft',
  "sentAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "NewsletterCampaignDelivery" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "campaignId" TEXT NOT NULL,
  "subscriberId" TEXT NOT NULL,
  "recipient" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "transport" TEXT NOT NULL DEFAULT '',
  "error" TEXT NOT NULL DEFAULT '',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "sentAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "NewsletterCampaignDelivery_campaignId_fkey"
    FOREIGN KEY ("campaignId") REFERENCES "NewsletterCampaign" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "NewsletterCampaignDelivery_subscriberId_fkey"
    FOREIGN KEY ("subscriberId") REFERENCES "NewsletterSubscriber" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "NewsletterCampaignDelivery_campaignId_subscriberId_key"
  ON "NewsletterCampaignDelivery"("campaignId","subscriberId");

CREATE INDEX IF NOT EXISTS "NewsletterCampaign_status_updatedAt_idx"
  ON "NewsletterCampaign"("status","updatedAt");

CREATE INDEX IF NOT EXISTS "NewsletterCampaignDelivery_campaignId_status_idx"
  ON "NewsletterCampaignDelivery"("campaignId","status");

CREATE INDEX IF NOT EXISTS "NewsletterCampaignDelivery_subscriberId_createdAt_idx"
  ON "NewsletterCampaignDelivery"("subscriberId","createdAt");
