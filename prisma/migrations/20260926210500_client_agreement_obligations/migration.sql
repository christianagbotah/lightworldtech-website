CREATE TABLE "ClientAgreementObligation" (
    "id" TEXT NOT NULL,
    "agreementId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "owner" TEXT NOT NULL DEFAULT '',
    "dueDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'open',
    "notes" TEXT NOT NULL DEFAULT '',
    "evidenceUrl" TEXT NOT NULL DEFAULT '',
    "completedAt" TIMESTAMP(3),
    "completedBy" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ClientAgreementObligation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ClientAgreementObligation_agreementId_status_idx"
ON "ClientAgreementObligation"("agreementId", "status");

CREATE INDEX "ClientAgreementObligation_dueDate_idx"
ON "ClientAgreementObligation"("dueDate");

ALTER TABLE "ClientAgreementObligation"
ADD CONSTRAINT "ClientAgreementObligation_agreementId_fkey"
FOREIGN KEY ("agreementId") REFERENCES "ClientAgreement"("id")
ON DELETE CASCADE ON UPDATE CASCADE;