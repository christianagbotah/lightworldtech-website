CREATE TABLE "ClientAgreement" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "projectId" TEXT,
    "title" TEXT NOT NULL,
    "agreementType" TEXT NOT NULL DEFAULT 'contract',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "referenceNumber" TEXT NOT NULL DEFAULT '',
    "currency" TEXT NOT NULL DEFAULT 'GHS',
    "contractValue" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "effectiveDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "renewalNoticeDays" INTEGER NOT NULL DEFAULT 30,
    "owner" TEXT NOT NULL DEFAULT '',
    "documentUrl" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "signedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ClientAgreement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ClientAgreement_organizationId_status_idx" ON "ClientAgreement"("organizationId", "status");
CREATE INDEX "ClientAgreement_projectId_idx" ON "ClientAgreement"("projectId");
CREATE INDEX "ClientAgreement_expiryDate_idx" ON "ClientAgreement"("expiryDate");

ALTER TABLE "ClientAgreement"
ADD CONSTRAINT "ClientAgreement_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "ClientOrganization"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ClientAgreement"
ADD CONSTRAINT "ClientAgreement_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "ClientProject"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
