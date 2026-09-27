CREATE SEQUENCE IF NOT EXISTS "finance_treasury_plan_number_seq" START WITH 1 INCREMENT BY 1;

ALTER TABLE "FinanceVendorPayment"
  ADD COLUMN IF NOT EXISTS "sourceAccountId" TEXT;

CREATE INDEX IF NOT EXISTS "FinanceVendorPayment_sourceAccountId_paidAt_idx"
  ON "FinanceVendorPayment"("sourceAccountId", "paidAt");

DO $$ BEGIN
  ALTER TABLE "FinanceVendorPayment"
    ADD CONSTRAINT "FinanceVendorPayment_sourceAccountId_fkey"
    FOREIGN KEY ("sourceAccountId") REFERENCES "FinanceAccount"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "FinanceTreasuryPaymentPlan" (
  "id" TEXT NOT NULL,
  "planNumber" TEXT NOT NULL,
  "vendorId" TEXT NOT NULL,
  "sourceAccountId" TEXT NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'GHS',
  "amount" DECIMAL(18,2) NOT NULL,
  "scheduledFor" TIMESTAMP(3) NOT NULL,
  "method" TEXT NOT NULL DEFAULT 'bank_transfer',
  "reference" TEXT NOT NULL DEFAULT '',
  "notes" TEXT NOT NULL DEFAULT '',
  "allocationsJson" TEXT NOT NULL DEFAULT '[]',
  "status" TEXT NOT NULL DEFAULT 'draft',
  "approvalId" TEXT NOT NULL DEFAULT '',
  "requestedByAdminId" TEXT NOT NULL DEFAULT '',
  "requestedByName" TEXT NOT NULL DEFAULT '',
  "requestedByEmail" TEXT NOT NULL DEFAULT '',
  "submittedAt" TIMESTAMP(3),
  "approvedByAdminId" TEXT NOT NULL DEFAULT '',
  "approvedByName" TEXT NOT NULL DEFAULT '',
  "approvedByEmail" TEXT NOT NULL DEFAULT '',
  "approvedAt" TIMESTAMP(3),
  "decisionNotes" TEXT NOT NULL DEFAULT '',
  "executedByAdminId" TEXT NOT NULL DEFAULT '',
  "executedByName" TEXT NOT NULL DEFAULT '',
  "executedAt" TIMESTAMP(3),
  "resultPaymentId" TEXT NOT NULL DEFAULT '',
  "resultPaymentNumber" TEXT NOT NULL DEFAULT '',
  "createdByAdminId" TEXT NOT NULL,
  "createdByName" TEXT NOT NULL DEFAULT '',
  "createdByEmail" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FinanceTreasuryPaymentPlan_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "FinanceTreasuryPaymentPlan_planNumber_key"
  ON "FinanceTreasuryPaymentPlan"("planNumber");
CREATE INDEX IF NOT EXISTS "FinanceTreasuryPaymentPlan_status_scheduledFor_idx"
  ON "FinanceTreasuryPaymentPlan"("status", "scheduledFor");
CREATE INDEX IF NOT EXISTS "FinanceTreasuryPaymentPlan_vendorId_status_scheduledFor_idx"
  ON "FinanceTreasuryPaymentPlan"("vendorId", "status", "scheduledFor");
CREATE INDEX IF NOT EXISTS "FinanceTreasuryPaymentPlan_sourceAccountId_status_scheduledFor_idx"
  ON "FinanceTreasuryPaymentPlan"("sourceAccountId", "status", "scheduledFor");
CREATE INDEX IF NOT EXISTS "FinanceTreasuryPaymentPlan_approvalId_idx"
  ON "FinanceTreasuryPaymentPlan"("approvalId");
CREATE INDEX IF NOT EXISTS "FinanceTreasuryPaymentPlan_createdByAdminId_status_idx"
  ON "FinanceTreasuryPaymentPlan"("createdByAdminId", "status");

DO $$ BEGIN
  ALTER TABLE "FinanceTreasuryPaymentPlan"
    ADD CONSTRAINT "FinanceTreasuryPaymentPlan_vendorId_fkey"
    FOREIGN KEY ("vendorId") REFERENCES "FinanceVendor"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "FinanceTreasuryPaymentPlan"
    ADD CONSTRAINT "FinanceTreasuryPaymentPlan_sourceAccountId_fkey"
    FOREIGN KEY ("sourceAccountId") REFERENCES "FinanceAccount"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;