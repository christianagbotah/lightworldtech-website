CREATE SEQUENCE IF NOT EXISTS "finance_treasury_run_number_seq";

CREATE TABLE "FinanceTreasuryPaymentRun" (
  "id" TEXT NOT NULL,
  "runNumber" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "currency" TEXT NOT NULL DEFAULT 'GHS',
  "plannedDate" TIMESTAMP(3) NOT NULL,
  "dueThrough" TIMESTAMP(3) NOT NULL,
  "sourceSystemKey" TEXT NOT NULL,
  "sourceLabel" TEXT NOT NULL,
  "sourceReference" TEXT NOT NULL DEFAULT '',
  "notes" TEXT NOT NULL DEFAULT '',
  "preparedByAdminId" TEXT NOT NULL,
  "preparedByName" TEXT NOT NULL DEFAULT '',
  "preparedByEmail" TEXT NOT NULL DEFAULT '',
  "submittedByAdminId" TEXT NOT NULL DEFAULT '',
  "submittedByName" TEXT NOT NULL DEFAULT '',
  "submittedByEmail" TEXT NOT NULL DEFAULT '',
  "submittedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FinanceTreasuryPaymentRun_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FinanceTreasuryPaymentRun_valid_status"
    CHECK ("status" IN ('draft','submitted','executed','needs_attention','cancelled')),
  CONSTRAINT "FinanceTreasuryPaymentRun_valid_source"
    CHECK ("sourceSystemKey" IN ('cash','bank','mobile_money'))
);

CREATE TABLE "FinanceTreasuryPaymentRunLine" (
  "id" TEXT NOT NULL,
  "runId" TEXT NOT NULL,
  "billId" TEXT NOT NULL,
  "vendorId" TEXT NOT NULL,
  "vendorName" TEXT NOT NULL,
  "payableNumber" TEXT NOT NULL,
  "dueDate" TIMESTAMP(3) NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'planned',
  "approvalId" TEXT NOT NULL DEFAULT '',
  "paymentId" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FinanceTreasuryPaymentRunLine_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FinanceTreasuryPaymentRunLine_positive_amount" CHECK ("amount" > 0),
  CONSTRAINT "FinanceTreasuryPaymentRunLine_valid_status"
    CHECK ("status" IN ('planned','submitted','executed','rejected','cancelled')),
  CONSTRAINT "FinanceTreasuryPaymentRunLine_runId_fkey"
    FOREIGN KEY ("runId") REFERENCES "FinanceTreasuryPaymentRun"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "FinanceTreasuryPaymentRunLine_billId_fkey"
    FOREIGN KEY ("billId") REFERENCES "FinanceVendorBill"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "FinanceTreasuryPaymentRun_runNumber_key"
  ON "FinanceTreasuryPaymentRun"("runNumber");
CREATE INDEX "FinanceTreasuryPaymentRun_status_plannedDate_idx"
  ON "FinanceTreasuryPaymentRun"("status","plannedDate");
CREATE INDEX "FinanceTreasuryPaymentRun_currency_dueThrough_idx"
  ON "FinanceTreasuryPaymentRun"("currency","dueThrough");
CREATE INDEX "FinanceTreasuryPaymentRun_preparedByAdminId_status_idx"
  ON "FinanceTreasuryPaymentRun"("preparedByAdminId","status");
CREATE UNIQUE INDEX "FinanceTreasuryPaymentRunLine_runId_billId_key"
  ON "FinanceTreasuryPaymentRunLine"("runId","billId");
CREATE INDEX "FinanceTreasuryPaymentRunLine_billId_status_idx"
  ON "FinanceTreasuryPaymentRunLine"("billId","status");
CREATE INDEX "FinanceTreasuryPaymentRunLine_vendorId_status_idx"
  ON "FinanceTreasuryPaymentRunLine"("vendorId","status");
CREATE INDEX "FinanceTreasuryPaymentRunLine_approvalId_idx"
  ON "FinanceTreasuryPaymentRunLine"("approvalId");