CREATE SEQUENCE IF NOT EXISTS "finance_receipt_approval_number_seq" START 1;

CREATE TABLE "FinanceReceiptApproval" (
  "id" TEXT NOT NULL,
  "requestNumber" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "organizationId" TEXT NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'GHS',
  "amount" DECIMAL(18,2) NOT NULL,
  "paidAt" TIMESTAMP(3) NOT NULL,
  "method" TEXT NOT NULL DEFAULT 'bank_transfer',
  "reference" TEXT NOT NULL DEFAULT '',
  "notes" TEXT NOT NULL DEFAULT '',
  "allocationsJson" TEXT NOT NULL DEFAULT '[]',
  "requestedByAdminId" TEXT NOT NULL,
  "requestedByName" TEXT NOT NULL DEFAULT '',
  "requestedByEmail" TEXT NOT NULL DEFAULT '',
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "decidedByAdminId" TEXT NOT NULL DEFAULT '',
  "decidedByName" TEXT NOT NULL DEFAULT '',
  "decidedByEmail" TEXT NOT NULL DEFAULT '',
  "decidedAt" TIMESTAMP(3),
  "decisionNotes" TEXT NOT NULL DEFAULT '',
  "resultPaymentId" TEXT NOT NULL DEFAULT '',
  "resultReceiptNumber" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FinanceReceiptApproval_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FinanceReceiptApproval_requestNumber_key" ON "FinanceReceiptApproval"("requestNumber");
CREATE INDEX "FinanceReceiptApproval_status_requestedAt_idx" ON "FinanceReceiptApproval"("status", "requestedAt");
CREATE INDEX "FinanceReceiptApproval_organizationId_status_idx" ON "FinanceReceiptApproval"("organizationId", "status");
CREATE INDEX "FinanceReceiptApproval_requestedByAdminId_status_idx" ON "FinanceReceiptApproval"("requestedByAdminId", "status");

ALTER TABLE "FinanceReceiptApproval"
ADD CONSTRAINT "FinanceReceiptApproval_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "ClientOrganization"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
