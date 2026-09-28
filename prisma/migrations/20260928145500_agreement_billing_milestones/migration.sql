CREATE TABLE "ClientAgreementBillingMilestone" (
  "id" TEXT NOT NULL,
  "agreementId" TEXT NOT NULL,
  "invoiceId" TEXT,
  "title" TEXT NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL,
  "dueDate" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'planned',
  "notes" TEXT NOT NULL DEFAULT '',
  "createdBy" TEXT NOT NULL DEFAULT 'Admin',
  "waivedAt" TIMESTAMP(3),
  "waivedBy" TEXT NOT NULL DEFAULT '',
  "waiverReason" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ClientAgreementBillingMilestone_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ClientAgreementBillingMilestone_agreementId_status_idx"
ON "ClientAgreementBillingMilestone"("agreementId", "status");

CREATE INDEX "ClientAgreementBillingMilestone_invoiceId_idx"
ON "ClientAgreementBillingMilestone"("invoiceId");

CREATE INDEX "ClientAgreementBillingMilestone_dueDate_status_idx"
ON "ClientAgreementBillingMilestone"("dueDate", "status");

ALTER TABLE "ClientAgreementBillingMilestone"
ADD CONSTRAINT "ClientAgreementBillingMilestone_agreementId_fkey"
FOREIGN KEY ("agreementId") REFERENCES "ClientAgreement"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ClientAgreementBillingMilestone"
ADD CONSTRAINT "ClientAgreementBillingMilestone_invoiceId_fkey"
FOREIGN KEY ("invoiceId") REFERENCES "ClientInvoice"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
