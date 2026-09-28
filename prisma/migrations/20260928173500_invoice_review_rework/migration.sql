ALTER TABLE "ClientInvoice"
ADD COLUMN "reviewStatus" TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN "reviewedByAdminId" TEXT NOT NULL DEFAULT '',
ADD COLUMN "reviewedBy" TEXT NOT NULL DEFAULT '',
ADD COLUMN "reviewedAt" TIMESTAMP(3),
ADD COLUMN "reviewNotes" TEXT NOT NULL DEFAULT '';

CREATE INDEX "ClientInvoice_status_reviewStatus_idx"
ON "ClientInvoice"("status", "reviewStatus");

ALTER TABLE "ClientInvoice"
ADD CONSTRAINT "ClientInvoice_valid_review_status"
CHECK ("reviewStatus" IN ('pending', 'rejected', 'approved'));
