ALTER TABLE "ClientInvoice"
ADD COLUMN "billingMilestoneId" TEXT;

CREATE INDEX "ClientInvoice_billingMilestoneId_idx"
ON "ClientInvoice"("billingMilestoneId");

ALTER TABLE "ClientInvoice"
ADD CONSTRAINT "ClientInvoice_billingMilestoneId_fkey"
FOREIGN KEY ("billingMilestoneId") REFERENCES "ClientAgreementBillingMilestone"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
