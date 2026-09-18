-- Phase 4 CRM schema upgrade.
-- Additive and idempotent: creates new Lead / LeadNote tables only.

PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS "Lead" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "contactMessageId" TEXT NOT NULL UNIQUE,
  "status" TEXT NOT NULL DEFAULT 'new',
  "priority" TEXT NOT NULL DEFAULT 'normal',
  "assignedTo" TEXT NOT NULL DEFAULT '',
  "source" TEXT NOT NULL DEFAULT 'website',
  "summary" TEXT NOT NULL DEFAULT '',
  "tags" TEXT NOT NULL DEFAULT '[]',
  "nextFollowUp" DATETIME,
  "lastContactedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Lead_contactMessageId_fkey"
    FOREIGN KEY ("contactMessageId") REFERENCES "ContactMessage" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "LeadNote" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "leadId" TEXT NOT NULL,
  "note" TEXT NOT NULL,
  "author" TEXT NOT NULL DEFAULT 'Admin',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LeadNote_leadId_fkey"
    FOREIGN KEY ("leadId") REFERENCES "Lead" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "Lead_status_updatedAt_idx" ON "Lead"("status", "updatedAt");
CREATE INDEX IF NOT EXISTS "Lead_priority_updatedAt_idx" ON "Lead"("priority", "updatedAt");
CREATE INDEX IF NOT EXISTS "Lead_nextFollowUp_idx" ON "Lead"("nextFollowUp");
CREATE INDEX IF NOT EXISTS "LeadNote_leadId_createdAt_idx" ON "LeadNote"("leadId", "createdAt");
