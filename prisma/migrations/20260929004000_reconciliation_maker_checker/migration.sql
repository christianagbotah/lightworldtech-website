ALTER TABLE "FinanceReconciliationBatch"
  ADD COLUMN "importedByAdminId" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "reconciledByAdminId" TEXT NOT NULL DEFAULT '';

ALTER TABLE "FinanceReconciliationLine"
  ADD COLUMN "matchedByAdminId" TEXT NOT NULL DEFAULT '';

CREATE INDEX "FinanceReconciliationBatch_importedByAdminId_status_idx"
ON "FinanceReconciliationBatch"("importedByAdminId", "status");

CREATE INDEX "FinanceReconciliationLine_matchedByAdminId_status_idx"
ON "FinanceReconciliationLine"("matchedByAdminId", "status");
