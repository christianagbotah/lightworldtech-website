CREATE TABLE "ClientAgreementChange" (
    "id" TEXT NOT NULL,
    "agreementId" TEXT NOT NULL,
    "changedBy" TEXT NOT NULL DEFAULT 'Admin',
    "changeType" TEXT NOT NULL DEFAULT 'update',
    "fields" TEXT NOT NULL DEFAULT '',
    "beforeState" JSONB NOT NULL,
    "afterState" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClientAgreementChange_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ClientAgreementChange_agreementId_createdAt_idx"
ON "ClientAgreementChange"("agreementId", "createdAt");

ALTER TABLE "ClientAgreementChange"
ADD CONSTRAINT "ClientAgreementChange_agreementId_fkey"
FOREIGN KEY ("agreementId") REFERENCES "ClientAgreement"("id")
ON DELETE CASCADE ON UPDATE CASCADE;