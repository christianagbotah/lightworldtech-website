-- Phase 6 proposal/discovery workspace.
-- Additive and idempotent: creates only the Proposal table and index.

PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS "Proposal" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "leadId" TEXT NOT NULL UNIQUE,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "title" TEXT NOT NULL,
  "executiveSummary" TEXT NOT NULL DEFAULT '',
  "solution" TEXT NOT NULL DEFAULT '',
  "scope" TEXT NOT NULL DEFAULT '',
  "deliverables" TEXT NOT NULL DEFAULT '[]',
  "assumptions" TEXT NOT NULL DEFAULT '[]',
  "timeline" TEXT NOT NULL DEFAULT '',
  "commercialNotes" TEXT NOT NULL DEFAULT '',
  "nextSteps" TEXT NOT NULL DEFAULT '',
  "version" INTEGER NOT NULL DEFAULT 1,
  "approvedBy" TEXT NOT NULL DEFAULT '',
  "approvedAt" DATETIME,
  "sentAt" DATETIME,
  "lastGeneratedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Proposal_leadId_fkey"
    FOREIGN KEY ("leadId") REFERENCES "Lead" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "Proposal_status_updatedAt_idx"
  ON "Proposal"("status", "updatedAt");
