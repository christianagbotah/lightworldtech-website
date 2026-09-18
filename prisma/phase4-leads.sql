-- Phase 4 lead pipeline schema upgrade.
-- Idempotent and additive: no existing CMS tables are altered.

CREATE TABLE IF NOT EXISTS "Lead" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "contactMessageId" TEXT,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL DEFAULT '',
  "phone" TEXT NOT NULL DEFAULT '',
  "source" TEXT NOT NULL DEFAULT 'website',
  "category" TEXT NOT NULL DEFAULT 'General',
  "status" TEXT NOT NULL DEFAULT 'new',
  "priority" TEXT NOT NULL DEFAULT 'normal',
  "score" INTEGER NOT NULL DEFAULT 0,
  "summary" TEXT NOT NULL DEFAULT '',
  "assignedTo" TEXT NOT NULL DEFAULT '',
  "nextAction" TEXT NOT NULL DEFAULT '',
  "notes" TEXT NOT NULL DEFAULT '',
  "lastActivityAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Lead_contactMessageId_fkey"
    FOREIGN KEY ("contactMessageId") REFERENCES "ContactMessage" ("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "Lead_contactMessageId_key"
  ON "Lead"("contactMessageId");

CREATE INDEX IF NOT EXISTS "Lead_status_createdAt_idx"
  ON "Lead"("status", "createdAt");

CREATE INDEX IF NOT EXISTS "Lead_category_createdAt_idx"
  ON "Lead"("category", "createdAt");

CREATE INDEX IF NOT EXISTS "Lead_score_createdAt_idx"
  ON "Lead"("score", "createdAt");
