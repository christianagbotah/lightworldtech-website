CREATE SEQUENCE IF NOT EXISTS "finance_outflow_approval_number_seq" START 1;

CREATE TABLE "FinanceApprovalPolicy" (
  "id" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "requireSecondApprover" BOOLEAN NOT NULL DEFAULT true,
  "updatedBy" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FinanceApprovalPolicy_pkey" PRIMARY KEY ("id")
);

INSERT INTO "FinanceApprovalPolicy"
  ("id", "enabled", "requireSecondApprover", "updatedBy", "createdAt", "updatedAt")
VALUES
  ('default', false, true, '', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

CREATE TABLE "FinanceOutflowApproval" (
  "id" TEXT NOT NULL,
  "requestNumber" TEXT NOT NULL,
  "outflowType" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "counterpartyId" TEXT NOT NULL DEFAULT '',
  "counterpartyName" TEXT NOT NULL DEFAULT '',
  "sourceId" TEXT NOT NULL DEFAULT '',
  "sourceReference" TEXT NOT NULL DEFAULT '',
  "currency" TEXT NOT NULL DEFAULT 'GHS',
  "amount" DECIMAL(18,2) NOT NULL,
  "effectiveDate" TIMESTAMP(3) NOT NULL,
  "method" TEXT NOT NULL DEFAULT 'bank_transfer',
  "reference" TEXT NOT NULL DEFAULT '',
  "reason" TEXT NOT NULL DEFAULT '',
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
  "resultId" TEXT NOT NULL DEFAULT '',
  "resultNumber" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "FinanceOutflowApproval_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FinanceOutflowApproval_requestNumber_key" UNIQUE ("requestNumber"),
  CONSTRAINT "FinanceOutflowApproval_positive_amount" CHECK ("amount" > 0),
  CONSTRAINT "FinanceOutflowApproval_valid_type" CHECK ("outflowType" IN ('vendor_payment','customer_refund')),
  CONSTRAINT "FinanceOutflowApproval_valid_status" CHECK ("status" IN ('pending','approved','rejected','cancelled'))
);

CREATE INDEX "FinanceOutflowApproval_status_requestedAt_idx"
  ON "FinanceOutflowApproval"("status", "requestedAt");

CREATE INDEX "FinanceOutflowApproval_outflowType_status_idx"
  ON "FinanceOutflowApproval"("outflowType", "status");

CREATE INDEX "FinanceOutflowApproval_counterpartyId_status_idx"
  ON "FinanceOutflowApproval"("counterpartyId", "status");

CREATE INDEX "FinanceOutflowApproval_requestedByAdminId_status_idx"
  ON "FinanceOutflowApproval"("requestedByAdminId", "status");

CREATE INDEX "FinanceOutflowApproval_sourceId_status_idx"
  ON "FinanceOutflowApproval"("sourceId", "status");
