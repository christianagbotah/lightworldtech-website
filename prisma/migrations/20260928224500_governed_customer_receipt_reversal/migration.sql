CREATE SEQUENCE IF NOT EXISTS "finance_receipt_reversal_number_seq" START 1;

ALTER TABLE "ClientPayment"
ADD COLUMN "reversesPaymentId" TEXT,
ADD COLUMN "reversalReason" TEXT NOT NULL DEFAULT '';

CREATE UNIQUE INDEX "ClientPayment_reversesPaymentId_key" ON "ClientPayment"("reversesPaymentId");
CREATE INDEX "ClientPayment_reversesPaymentId_idx" ON "ClientPayment"("reversesPaymentId");

ALTER TABLE "ClientPayment"
ADD CONSTRAINT "ClientPayment_reversesPaymentId_fkey"
FOREIGN KEY ("reversesPaymentId") REFERENCES "ClientPayment"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "FinanceReceiptReversalRequest" (
  "id" TEXT NOT NULL,
  "requestNumber" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "organizationId" TEXT NOT NULL,
  "paymentId" TEXT NOT NULL,
  "reversalDate" TIMESTAMP(3) NOT NULL,
  "reason" TEXT NOT NULL,
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
  "resultPaymentNumber" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FinanceReceiptReversalRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FinanceReceiptReversalRequest_requestNumber_key" ON "FinanceReceiptReversalRequest"("requestNumber");
CREATE INDEX "FinanceReceiptReversalRequest_status_requestedAt_idx" ON "FinanceReceiptReversalRequest"("status","requestedAt");
CREATE INDEX "FinanceReceiptReversalRequest_paymentId_status_idx" ON "FinanceReceiptReversalRequest"("paymentId","status");
CREATE INDEX "FinanceReceiptReversalRequest_organizationId_status_idx" ON "FinanceReceiptReversalRequest"("organizationId","status");
CREATE INDEX "FinanceReceiptReversalRequest_requestedByAdminId_status_idx" ON "FinanceReceiptReversalRequest"("requestedByAdminId","status");

ALTER TABLE "FinanceReceiptReversalRequest"
ADD CONSTRAINT "FinanceReceiptReversalRequest_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "ClientOrganization"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "FinanceReceiptReversalRequest"
ADD CONSTRAINT "FinanceReceiptReversalRequest_paymentId_fkey"
FOREIGN KEY ("paymentId") REFERENCES "ClientPayment"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
