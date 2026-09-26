ALTER TABLE "ClientAgreementObligation"
ADD COLUMN "ownerAdminId" TEXT;

CREATE INDEX "ClientAgreementObligation_ownerAdminId_status_idx"
ON "ClientAgreementObligation"("ownerAdminId", "status");

ALTER TABLE "ClientAgreementObligation"
ADD CONSTRAINT "ClientAgreementObligation_ownerAdminId_fkey"
FOREIGN KEY ("ownerAdminId") REFERENCES "Admin"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
