ALTER TABLE "ClientAgreement" ADD COLUMN "supersedesAgreementId" TEXT;

CREATE UNIQUE INDEX "ClientAgreement_supersedesAgreementId_key"
ON "ClientAgreement"("supersedesAgreementId");

ALTER TABLE "ClientAgreement"
ADD CONSTRAINT "ClientAgreement_supersedesAgreementId_fkey"
FOREIGN KEY ("supersedesAgreementId") REFERENCES "ClientAgreement"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
