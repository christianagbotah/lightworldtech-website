CREATE SEQUENCE IF NOT EXISTS "finance_credit_note_number_seq" START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS "finance_customer_refund_number_seq" START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS "finance_reconciliation_batch_seq" START WITH 1 INCREMENT BY 1;

CREATE TABLE "FinanceCreditNote" (
  "id" TEXT NOT NULL,
  "creditNoteNumber" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "invoiceId" TEXT NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'GHS',
  "issueDate" TIMESTAMP(3) NOT NULL,
  "reason" TEXT NOT NULL,
  "subtotal" DECIMAL(18,2) NOT NULL,
  "tax" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "total" DECIMAL(18,2) NOT NULL,
  "appliedAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'posted',
  "createdBy" TEXT NOT NULL DEFAULT 'Admin',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "FinanceCreditNote_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FinanceCreditNote_amounts_nonnegative" CHECK (
    "subtotal" >= 0 AND "tax" >= 0 AND "total" > 0 AND "appliedAmount" >= 0
  ),
  CONSTRAINT "FinanceCreditNote_total_consistent" CHECK (
    ROUND("subtotal" + "tax", 2) = ROUND("total", 2)
  ),
  CONSTRAINT "FinanceCreditNote_applied_not_over_total" CHECK (
    "appliedAmount" <= "total"
  ),
  CONSTRAINT "FinanceCreditNote_valid_status" CHECK (
    "status" IN ('posted', 'void')
  )
);

CREATE TABLE "FinanceCustomerRefund" (
  "id" TEXT NOT NULL,
  "refundNumber" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "creditNoteId" TEXT NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'GHS',
  "amount" DECIMAL(18,2) NOT NULL,
  "refundedAt" TIMESTAMP(3) NOT NULL,
  "method" TEXT NOT NULL DEFAULT 'bank_transfer',
  "reference" TEXT NOT NULL DEFAULT '',
  "reason" TEXT NOT NULL DEFAULT '',
  "refundedBy" TEXT NOT NULL DEFAULT 'Admin',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "FinanceCustomerRefund_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FinanceCustomerRefund_positive_amount" CHECK ("amount" > 0),
  CONSTRAINT "FinanceCustomerRefund_valid_method" CHECK (
    "method" IN ('cash', 'bank_transfer', 'mobile_money', 'card', 'cheque', 'other')
  )
);

CREATE TABLE "FinanceReconciliationBatch" (
  "id" TEXT NOT NULL,
  "batchNumber" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "accountSystemKey" TEXT NOT NULL,
  "accountLabel" TEXT NOT NULL,
  "accountReference" TEXT NOT NULL DEFAULT '',
  "currency" TEXT NOT NULL DEFAULT 'GHS',
  "statementFrom" TIMESTAMP(3) NOT NULL,
  "statementTo" TIMESTAMP(3) NOT NULL,
  "openingBalance" DECIMAL(18,2) NOT NULL,
  "closingBalance" DECIMAL(18,2) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'open',
  "importedBy" TEXT NOT NULL DEFAULT 'Admin',
  "reconciledAt" TIMESTAMP(3),
  "reconciledBy" TEXT NOT NULL DEFAULT '',
  "notes" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "FinanceReconciliationBatch_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FinanceReconciliationBatch_valid_channel" CHECK (
    "channel" IN ('bank', 'mobile_money')
  ),
  CONSTRAINT "FinanceReconciliationBatch_valid_account_key" CHECK (
    "accountSystemKey" IN ('bank', 'mobile_money')
  ),
  CONSTRAINT "FinanceReconciliationBatch_valid_dates" CHECK (
    "statementTo" >= "statementFrom"
  ),
  CONSTRAINT "FinanceReconciliationBatch_valid_status" CHECK (
    "status" IN ('open', 'reconciled')
  )
);

CREATE TABLE "FinanceReconciliationLine" (
  "id" TEXT NOT NULL,
  "batchId" TEXT NOT NULL,
  "transactionDate" TIMESTAMP(3) NOT NULL,
  "description" TEXT NOT NULL,
  "reference" TEXT NOT NULL DEFAULT '',
  "direction" TEXT NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'unmatched',
  "matchedJournalLineId" TEXT,
  "matchedAt" TIMESTAMP(3),
  "matchedBy" TEXT NOT NULL DEFAULT '',
  "notes" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "FinanceReconciliationLine_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FinanceReconciliationLine_positive_amount" CHECK ("amount" > 0),
  CONSTRAINT "FinanceReconciliationLine_valid_direction" CHECK (
    "direction" IN ('in', 'out')
  ),
  CONSTRAINT "FinanceReconciliationLine_valid_status" CHECK (
    "status" IN ('unmatched', 'matched', 'ignored')
  )
);

CREATE UNIQUE INDEX "FinanceCreditNote_creditNoteNumber_key"
  ON "FinanceCreditNote"("creditNoteNumber");
CREATE INDEX "FinanceCreditNote_organizationId_issueDate_idx"
  ON "FinanceCreditNote"("organizationId", "issueDate");
CREATE INDEX "FinanceCreditNote_invoiceId_status_idx"
  ON "FinanceCreditNote"("invoiceId", "status");

CREATE UNIQUE INDEX "FinanceCustomerRefund_refundNumber_key"
  ON "FinanceCustomerRefund"("refundNumber");
CREATE INDEX "FinanceCustomerRefund_organizationId_refundedAt_idx"
  ON "FinanceCustomerRefund"("organizationId", "refundedAt");
CREATE INDEX "FinanceCustomerRefund_creditNoteId_refundedAt_idx"
  ON "FinanceCustomerRefund"("creditNoteId", "refundedAt");

CREATE UNIQUE INDEX "FinanceReconciliationBatch_batchNumber_key"
  ON "FinanceReconciliationBatch"("batchNumber");
CREATE INDEX "FinanceReconciliationBatch_accountSystemKey_currency_statementTo_idx"
  ON "FinanceReconciliationBatch"("accountSystemKey", "currency", "statementTo");
CREATE INDEX "FinanceReconciliationBatch_status_statementTo_idx"
  ON "FinanceReconciliationBatch"("status", "statementTo");

CREATE UNIQUE INDEX "FinanceReconciliationLine_matchedJournalLineId_key"
  ON "FinanceReconciliationLine"("matchedJournalLineId");
CREATE INDEX "FinanceReconciliationLine_batchId_status_idx"
  ON "FinanceReconciliationLine"("batchId", "status");
CREATE INDEX "FinanceReconciliationLine_transactionDate_amount_idx"
  ON "FinanceReconciliationLine"("transactionDate", "amount");

ALTER TABLE "FinanceCreditNote"
  ADD CONSTRAINT "FinanceCreditNote_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "ClientOrganization"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "FinanceCreditNote"
  ADD CONSTRAINT "FinanceCreditNote_invoiceId_fkey"
  FOREIGN KEY ("invoiceId") REFERENCES "ClientInvoice"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "FinanceCustomerRefund"
  ADD CONSTRAINT "FinanceCustomerRefund_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "ClientOrganization"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "FinanceCustomerRefund"
  ADD CONSTRAINT "FinanceCustomerRefund_creditNoteId_fkey"
  FOREIGN KEY ("creditNoteId") REFERENCES "FinanceCreditNote"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "FinanceReconciliationLine"
  ADD CONSTRAINT "FinanceReconciliationLine_batchId_fkey"
  FOREIGN KEY ("batchId") REFERENCES "FinanceReconciliationBatch"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FinanceReconciliationLine"
  ADD CONSTRAINT "FinanceReconciliationLine_matchedJournalLineId_fkey"
  FOREIGN KEY ("matchedJournalLineId") REFERENCES "FinanceJournalLine"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
