-- Phase 6 Proposal Assistant schema upgrade.
-- Additive and idempotent: creates the ProposalDraft table and indexes only.

PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS "ProposalDraft" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "leadId" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "title" TEXT NOT NULL,
  "executiveSummary" TEXT NOT NULL DEFAULT '',
  "problemStatement" TEXT NOT NULL DEFAULT '',
  "proposedSolution" TEXT NOT NULL DEFAULT '',
  "capabilities" TEXT NOT NULL DEFAULT '',
  "phases" TEXT NOT NULL DEFAULT '',
  "assumptions" TEXT NOT NULL DEFAULT '',
  "exclusions" TEXT NOT NULL DEFAULT '',
  "discoveryQuestions" TEXT NOT NULL DEFAULT '',
  "nextSteps" TEXT NOT NULL DEFAULT '',
  "commercialNotes" TEXT NOT NULL DEFAULT '',
  "createdBy" TEXT NOT NULL DEFAULT 'Admin',
  "approvedBy" TEXT NOT NULL DEFAULT '',
  "approvedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProposalDraft_leadId_fkey"
    FOREIGN KEY ("leadId") REFERENCES "Lead" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ProposalDraft_leadId_version_key"
    UNIQUE ("leadId", "version")
);

CREATE INDEX IF NOT EXISTS "ProposalDraft_leadId_updatedAt_idx"
  ON "ProposalDraft"("leadId", "updatedAt");

CREATE INDEX IF NOT EXISTS "ProposalDraft_status_updatedAt_idx"
  ON "ProposalDraft"("status", "updatedAt");
