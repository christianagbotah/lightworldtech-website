ALTER TABLE "FinanceMonthClose"
  ADD COLUMN "requestedByAdminId" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "requestedBy" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "requestedAt" TIMESTAMP(3),
  ADD COLUMN "approvedByAdminId" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "approvedBy" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "approvedAt" TIMESTAMP(3),
  ADD COLUMN "rejectedByAdminId" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "rejectedBy" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "rejectedAt" TIMESTAMP(3),
  ADD COLUMN "rejectionReason" TEXT NOT NULL DEFAULT '';

UPDATE "FinanceMonthClose"
SET
  "requestedBy" = CASE WHEN "closedBy" <> '' THEN "closedBy" ELSE '' END,
  "requestedAt" = "closedAt",
  "approvedBy" = CASE WHEN "closedBy" <> '' THEN "closedBy" ELSE '' END,
  "approvedAt" = "closedAt"
WHERE "status" = 'closed';

CREATE INDEX "FinanceMonthClose_requestedByAdminId_status_idx"
ON "FinanceMonthClose"("requestedByAdminId", "status");
