CREATE TABLE "FinanceTaxProfile" (
  "id" TEXT NOT NULL,
  "countryCode" TEXT NOT NULL DEFAULT 'GH',
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "vatRegistrationNumber" TEXT NOT NULL DEFAULT '',
  "vatRate" DECIMAL(5,2) NOT NULL DEFAULT 15.00,
  "nhilRate" DECIMAL(5,2) NOT NULL DEFAULT 2.50,
  "getfundRate" DECIMAL(5,2) NOT NULL DEFAULT 2.50,
  "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT TIMESTAMP '2026-01-01 00:00:00',
  "updatedBy" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "FinanceTaxProfile_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FinanceTaxProfile_nonnegative_rates" CHECK (
    "vatRate" >= 0 AND "nhilRate" >= 0 AND "getfundRate" >= 0
  )
);

INSERT INTO "FinanceTaxProfile"
  ("id", "countryCode", "enabled", "vatRegistrationNumber", "vatRate", "nhilRate", "getfundRate", "effectiveFrom", "updatedBy", "createdAt", "updatedAt")
VALUES
  ('ghana-default', 'GH', false, '', 15.00, 2.50, 2.50, TIMESTAMP '2026-01-01 00:00:00', '', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

ALTER TABLE "ClientInvoice"
  ADD COLUMN "taxTreatment" TEXT NOT NULL DEFAULT 'legacy',
  ADD COLUMN "taxableAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN "vatRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN "vatAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN "nhilRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN "nhilAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN "getfundRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN "getfundAmount" DECIMAL(18,2) NOT NULL DEFAULT 0;

ALTER TABLE "ClientInvoice"
  ADD CONSTRAINT "ClientInvoice_valid_tax_treatment"
  CHECK ("taxTreatment" IN ('legacy', 'none', 'standard', 'zero', 'exempt'));

ALTER TABLE "ClientInvoice"
  ADD CONSTRAINT "ClientInvoice_nonnegative_tax_components"
  CHECK (
    "taxableAmount" >= 0 AND
    "vatRate" >= 0 AND "vatAmount" >= 0 AND
    "nhilRate" >= 0 AND "nhilAmount" >= 0 AND
    "getfundRate" >= 0 AND "getfundAmount" >= 0
  );

ALTER TABLE "FinanceCreditNote"
  ADD COLUMN "vatAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN "nhilAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN "getfundAmount" DECIMAL(18,2) NOT NULL DEFAULT 0;

ALTER TABLE "FinanceCreditNote"
  ADD CONSTRAINT "FinanceCreditNote_nonnegative_tax_components"
  CHECK ("vatAmount" >= 0 AND "nhilAmount" >= 0 AND "getfundAmount" >= 0);

INSERT INTO "FinanceAccount"
  ("id", "code", "name", "type", "subtype", "systemKey", "description", "active", "allowPosting", "createdAt", "updatedAt")
VALUES
  ('coa_2210_vat_payable', '2210', 'VAT Payable', 'liability', 'vat_payable', 'vat_payable', 'Ghana Value Added Tax output less allowed tax adjustments.', true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('coa_2220_nhil_payable', '2220', 'NHIL Payable', 'liability', 'nhil_payable', 'nhil_payable', 'National Health Insurance Levy control account.', true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('coa_2230_getfund_payable', '2230', 'GETFund Levy Payable', 'liability', 'getfund_payable', 'getfund_payable', 'Ghana Education Trust Fund Levy control account.', true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;
