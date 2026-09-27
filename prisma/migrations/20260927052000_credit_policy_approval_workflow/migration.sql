CREATE TABLE "FinanceCreditPolicyApproval" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "paymentTermsDays" INTEGER NOT NULL,
    "creditLimitCurrency" TEXT NOT NULL,
    "creditLimit" DECIMAL(18,2) NOT NULL,
    "creditHold" BOOLEAN NOT NULL,
    "creditHoldReason" TEXT NOT NULL DEFAULT '',
    "previousPolicyJson" TEXT NOT NULL DEFAULT '{}',
    "requestedByAdminId" TEXT NOT NULL,
    "requestedByName" TEXT NOT NULL DEFAULT '',
    "requestedByEmail" TEXT NOT NULL DEFAULT '',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedByAdminId" TEXT NOT NULL DEFAULT '',
    "decidedByName" TEXT NOT NULL DEFAULT '',
    "decidedByEmail" TEXT NOT NULL DEFAULT '',
    "decidedAt" TIMESTAMP(3),
    "decisionNotes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FinanceCreditPolicyApproval_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FinanceCreditPolicyApproval_organizationId_status_requestedAt_idx"
ON "FinanceCreditPolicyApproval"("organizationId", "status", "requestedAt");

CREATE INDEX "FinanceCreditPolicyApproval_status_requestedAt_idx"
ON "FinanceCreditPolicyApproval"("status", "requestedAt");

CREATE INDEX "FinanceCreditPolicyApproval_requestedByAdminId_status_idx"
ON "FinanceCreditPolicyApproval"("requestedByAdminId", "status");

ALTER TABLE "FinanceCreditPolicyApproval"
ADD CONSTRAINT "FinanceCreditPolicyApproval_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "ClientOrganization"("id")
ON DELETE CASCADE ON UPDATE CASCADE;