ALTER TABLE "ClientInvoice" ADD COLUMN "replacesInvoiceId" TEXT;

CREATE UNIQUE INDEX "ClientInvoice_replacesInvoiceId_key"
ON "ClientInvoice"("replacesInvoiceId");

CREATE INDEX "ClientInvoice_replacesInvoiceId_idx"
ON "ClientInvoice"("replacesInvoiceId");

ALTER TABLE "ClientInvoice"
ADD CONSTRAINT "ClientInvoice_replacesInvoiceId_fkey"
FOREIGN KEY ("replacesInvoiceId") REFERENCES "ClientInvoice"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
