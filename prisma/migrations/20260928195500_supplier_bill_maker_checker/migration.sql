ALTER TABLE "FinanceVendorBill"
ADD COLUMN "createdByAdminId" TEXT NOT NULL DEFAULT '',
ADD COLUMN "createdBy" TEXT NOT NULL DEFAULT 'Admin',
ADD COLUMN "approvedByAdminId" TEXT NOT NULL DEFAULT '',
ADD COLUMN "approvedBy" TEXT NOT NULL DEFAULT '',
ADD COLUMN "approvedAt" TIMESTAMP(3),
ADD COLUMN "rejectedByAdminId" TEXT NOT NULL DEFAULT '',
ADD COLUMN "rejectedBy" TEXT NOT NULL DEFAULT '',
ADD COLUMN "rejectedAt" TIMESTAMP(3),
ADD COLUMN "rejectionReason" TEXT NOT NULL DEFAULT '';

CREATE INDEX "FinanceVendorBill_status_createdAt_idx"
ON "FinanceVendorBill"("status", "createdAt");
