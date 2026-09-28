ALTER TABLE "ClientInvoice" ADD COLUMN "agreementId" TEXT;

CREATE INDEX "ClientInvoice_agreementId_idx" ON "ClientInvoice"("agreementId");

ALTER TABLE "ClientInvoice"
ADD CONSTRAINT "ClientInvoice_agreementId_fkey"
FOREIGN KEY ("agreementId") REFERENCES "ClientAgreement"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
