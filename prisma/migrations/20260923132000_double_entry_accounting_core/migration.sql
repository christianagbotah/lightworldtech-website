CREATE SEQUENCE IF NOT EXISTS "finance_journal_number_seq" START WITH 1 INCREMENT BY 1;

CREATE TABLE "FinanceAccount" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "subtype" TEXT NOT NULL DEFAULT '',
  "systemKey" TEXT,
  "description" TEXT NOT NULL DEFAULT '',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "allowPosting" BOOLEAN NOT NULL DEFAULT true,
  "parentId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "FinanceAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FinanceAccountingPeriod" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'open',
  "closedAt" TIMESTAMP(3),
  "closedBy" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "FinanceAccountingPeriod_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FinanceAccountingPeriod_valid_dates" CHECK ("endDate" >= "startDate"),
  CONSTRAINT "FinanceAccountingPeriod_valid_status" CHECK ("status" IN ('open', 'closed'))
);

CREATE TABLE "FinanceJournalEntry" (
  "id" TEXT NOT NULL,
  "journalNumber" TEXT NOT NULL,
  "entryDate" TIMESTAMP(3) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'GHS',
  "description" TEXT NOT NULL,
  "reference" TEXT NOT NULL DEFAULT '',
  "sourceType" TEXT NOT NULL DEFAULT 'manual',
  "sourceId" TEXT NOT NULL DEFAULT '',
  "status" TEXT NOT NULL DEFAULT 'posted',
  "postedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "postedBy" TEXT NOT NULL DEFAULT 'Admin',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "FinanceJournalEntry_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FinanceJournalEntry_valid_status" CHECK ("status" IN ('posted', 'reversed'))
);

CREATE TABLE "FinanceJournalLine" (
  "id" TEXT NOT NULL,
  "entryId" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "debit" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "credit" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "FinanceJournalLine_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FinanceJournalLine_debit_nonnegative" CHECK ("debit" >= 0),
  CONSTRAINT "FinanceJournalLine_credit_nonnegative" CHECK ("credit" >= 0),
  CONSTRAINT "FinanceJournalLine_one_sided" CHECK (
    ("debit" > 0 AND "credit" = 0) OR
    ("credit" > 0 AND "debit" = 0)
  )
);

CREATE UNIQUE INDEX "FinanceAccount_code_key" ON "FinanceAccount"("code");
CREATE UNIQUE INDEX "FinanceAccount_systemKey_key" ON "FinanceAccount"("systemKey");
CREATE INDEX "FinanceAccount_type_active_idx" ON "FinanceAccount"("type", "active");
CREATE INDEX "FinanceAccount_parentId_idx" ON "FinanceAccount"("parentId");

CREATE UNIQUE INDEX "FinanceAccountingPeriod_startDate_endDate_key"
  ON "FinanceAccountingPeriod"("startDate", "endDate");
CREATE INDEX "FinanceAccountingPeriod_status_startDate_endDate_idx"
  ON "FinanceAccountingPeriod"("status", "startDate", "endDate");

CREATE UNIQUE INDEX "FinanceJournalEntry_journalNumber_key"
  ON "FinanceJournalEntry"("journalNumber");
CREATE INDEX "FinanceJournalEntry_entryDate_status_idx"
  ON "FinanceJournalEntry"("entryDate", "status");
CREATE INDEX "FinanceJournalEntry_currency_entryDate_idx"
  ON "FinanceJournalEntry"("currency", "entryDate");
CREATE INDEX "FinanceJournalEntry_sourceType_sourceId_idx"
  ON "FinanceJournalEntry"("sourceType", "sourceId");

CREATE INDEX "FinanceJournalLine_entryId_idx" ON "FinanceJournalLine"("entryId");
CREATE INDEX "FinanceJournalLine_accountId_createdAt_idx"
  ON "FinanceJournalLine"("accountId", "createdAt");

ALTER TABLE "FinanceAccount"
  ADD CONSTRAINT "FinanceAccount_parentId_fkey"
  FOREIGN KEY ("parentId") REFERENCES "FinanceAccount"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "FinanceJournalLine"
  ADD CONSTRAINT "FinanceJournalLine_entryId_fkey"
  FOREIGN KEY ("entryId") REFERENCES "FinanceJournalEntry"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FinanceJournalLine"
  ADD CONSTRAINT "FinanceJournalLine_accountId_fkey"
  FOREIGN KEY ("accountId") REFERENCES "FinanceAccount"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "FinanceAccount"
  ("id", "code", "name", "type", "subtype", "systemKey", "description", "active", "allowPosting", "createdAt", "updatedAt")
VALUES
  ('coa_1000_cash', '1000', 'Cash on Hand', 'asset', 'cash', 'cash', 'Physical cash and petty cash balances.', true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('coa_1010_bank', '1010', 'Bank Accounts', 'asset', 'bank', 'bank', 'Company bank balances.', true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('coa_1020_mobile_money', '1020', 'Mobile Money', 'asset', 'mobile_money', 'mobile_money', 'Company mobile-money wallet balances.', true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('coa_1100_receivable', '1100', 'Accounts Receivable', 'asset', 'receivable', 'accounts_receivable', 'Amounts owed by customers on issued invoices.', true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('coa_1200_prepaid', '1200', 'Prepaid Expenses', 'asset', 'prepaid', 'prepaid_expenses', 'Expenses paid before the related service period.', true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('coa_2000_payable', '2000', 'Accounts Payable', 'liability', 'payable', 'accounts_payable', 'Amounts owed to suppliers.', true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('coa_2050_customer_deposits', '2050', 'Customer Deposits', 'liability', 'customer_deposits', 'customer_deposits', 'Customer receipts not yet applied to invoices.', true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('coa_2100_accrued', '2100', 'Accrued Expenses', 'liability', 'accrued_expenses', 'Expenses recognized before payment.', true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('coa_2200_tax_payable', '2200', 'Tax Payable', 'liability', 'tax_payable', 'tax_payable', 'Tax collected or accrued and payable to the relevant authority.', true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('coa_3000_equity', '3000', 'Owner Equity', 'equity', 'owner_equity', 'owner_equity', 'Owner or shareholder capital.', true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('coa_3100_retained', '3100', 'Retained Earnings', 'equity', 'retained_earnings', 'retained_earnings', 'Accumulated retained earnings.', true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('coa_4000_service_revenue', '4000', 'Service Revenue', 'revenue', 'service_revenue', 'service_revenue', 'Revenue from software, IT and managed services.', true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('coa_4100_other_revenue', '4100', 'Other Revenue', 'revenue', 'other_revenue', 'other_revenue', 'Revenue not classified as core service revenue.', true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('coa_5000_cost_services', '5000', 'Cost of Services', 'expense', 'cost_of_services', 'cost_of_services', 'Direct costs incurred in delivering client services.', true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('coa_6000_operating', '6000', 'Operating Expenses', 'expense', 'operating_expense', 'operating_expense', 'General operating expenses.', true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('coa_6100_hosting', '6100', 'Hosting & Infrastructure', 'expense', 'hosting_infrastructure', 'hosting_expense', 'Cloud, hosting, VPS, domains and infrastructure costs.', true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('coa_6200_comms', '6200', 'Communications & SMS', 'expense', 'communications', 'communications_expense', 'Telecommunications, SMS and messaging costs.', true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('coa_6300_payment_fees', '6300', 'Payment Processing Fees', 'expense', 'payment_fees', 'payment_fees', 'Payment gateway and transaction processing fees.', true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('coa_6900_uncategorized', '6900', 'Uncategorized Expense', 'expense', 'uncategorized', 'uncategorized_expense', 'Temporary classification for expenses awaiting account mapping.', true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;
