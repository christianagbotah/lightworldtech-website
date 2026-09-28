CREATE TABLE "ClientAgreementBillingMilestone" (
  "id" TEXT NOT NULL,
  "agreementId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL,
  "dueDate" TIMESTAMP(3),
  "order" INTEGER NOT NULL DEFAULT 0,
  "notes" TEXT NOT NULL DEFAULT '',
  "createdBy" TEXT NOT NULL DEFAULT 'Admin',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ClientAgreementBillingMilestone_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ClientAgreementBillingMilestone_amount_check" CHECK ("amount" > 0)
);

CREATE INDEX "ClientAgreementBillingMilestone_agreementId_order_idx"
ON "ClientAgreementBillingMilestone"("agreementId", "order");

CREATE INDEX "ClientAgreementBillingMilestone_agreementId_dueDate_idx"
ON "ClientAgreementBillingMilestone"("agreementId", "dueDate");

ALTER TABLE "ClientAgreementBillingMilestone"
ADD CONSTRAINT "ClientAgreementBillingMilestone_agreementId_fkey"
FOREIGN KEY ("agreementId") REFERENCES "ClientAgreement"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
