CREATE TABLE "InvoiceAccessLink" (
  "id" TEXT NOT NULL,
  "invoiceId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdBy" TEXT NOT NULL DEFAULT 'Admin',
  "sentTo" TEXT NOT NULL DEFAULT '',
  "sentCount" INTEGER NOT NULL DEFAULT 0,
  "lastSentAt" TIMESTAMP(3),
  "firstViewedAt" TIMESTAMP(3),
  "lastViewedAt" TIMESTAMP(3),
  "viewCount" INTEGER NOT NULL DEFAULT 0,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InvoiceAccessLink_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InvoiceAccessLink_tokenHash_key"
ON "InvoiceAccessLink"("tokenHash");

CREATE INDEX "InvoiceAccessLink_invoiceId_status_expiresAt_idx"
ON "InvoiceAccessLink"("invoiceId", "status", "expiresAt");

CREATE INDEX "InvoiceAccessLink_status_expiresAt_idx"
ON "InvoiceAccessLink"("status", "expiresAt");

ALTER TABLE "InvoiceAccessLink"
ADD CONSTRAINT "InvoiceAccessLink_invoiceId_fkey"
FOREIGN KEY ("invoiceId") REFERENCES "ClientInvoice"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
