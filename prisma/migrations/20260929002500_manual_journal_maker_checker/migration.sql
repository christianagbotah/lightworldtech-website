ALTER TABLE "FinanceJournalEntry"
  ADD COLUMN "createdByAdminId" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "createdBy" TEXT NOT NULL DEFAULT 'Admin',
  ADD COLUMN "approvedByAdminId" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "approvedBy" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "approvedAt" TIMESTAMP(3),
  ADD COLUMN "rejectedByAdminId" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "rejectedBy" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "rejectedAt" TIMESTAMP(3),
  ADD COLUMN "rejectionReason" TEXT NOT NULL DEFAULT '';

ALTER TABLE "FinanceJournalEntry"
  ALTER COLUMN "postedAt" DROP DEFAULT,
  ALTER COLUMN "postedAt" DROP NOT NULL,
  ALTER COLUMN "postedBy" SET DEFAULT '';

UPDATE "FinanceJournalEntry"
SET
  "createdBy" = CASE WHEN "postedBy" <> '' THEN "postedBy" ELSE 'System' END,
  "approvedBy" = CASE WHEN "postedBy" <> '' THEN "postedBy" ELSE 'System' END,
  "approvedAt" = "postedAt"
WHERE "status" IN ('posted', 'reversed');

CREATE INDEX "FinanceJournalEntry_createdByAdminId_status_idx"
ON "FinanceJournalEntry"("createdByAdminId", "status");
