ALTER TABLE "ClientAgreementAttachment"
ADD COLUMN "visibleToClient" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "ClientAgreementAttachment_agreementId_visibleToClient_createdAt_idx"
ON "ClientAgreementAttachment"("agreementId", "visibleToClient", "createdAt");