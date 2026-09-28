ALTER TABLE "ClientAgreementBillingMilestone"
ADD COLUMN "status" TEXT NOT NULL DEFAULT 'planned',
ADD COLUMN "waivedAt" TIMESTAMP(3),
ADD COLUMN "waivedBy" TEXT NOT NULL DEFAULT '',
ADD COLUMN "waiverReason" TEXT NOT NULL DEFAULT '';

CREATE INDEX "ClientAgreementBillingMilestone_agreementId_status_idx"
ON "ClientAgreementBillingMilestone"("agreementId", "status");

CREATE INDEX "ClientAgreementBillingMilestone_dueDate_status_idx"
ON "ClientAgreementBillingMilestone"("dueDate", "status");

ALTER TABLE "ClientInvoice"
ADD COLUMN "billingMilestoneId" TEXT;

CREATE INDEX "ClientInvoice_billingMilestoneId_idx"
ON "ClientInvoice"("billingMilestoneId");

ALTER TABLE "ClientInvoice"
ADD CONSTRAINT "ClientInvoice_billingMilestoneId_fkey"
FOREIGN KEY ("billingMilestoneId") REFERENCES "ClientAgreementBillingMilestone"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
