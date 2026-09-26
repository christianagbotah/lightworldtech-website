CREATE TABLE "ClientAgreementAttachment" (
    "id" TEXT NOT NULL,
    "agreementId" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "storageName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "uploadedBy" TEXT NOT NULL DEFAULT 'Admin',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClientAgreementAttachment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClientAgreementAttachment_storageName_key"
ON "ClientAgreementAttachment"("storageName");

CREATE INDEX "ClientAgreementAttachment_agreementId_createdAt_idx"
ON "ClientAgreementAttachment"("agreementId", "createdAt");

ALTER TABLE "ClientAgreementAttachment"
ADD CONSTRAINT "ClientAgreementAttachment_agreementId_fkey"
FOREIGN KEY ("agreementId") REFERENCES "ClientAgreement"("id")
ON DELETE CASCADE ON UPDATE CASCADE;