CREATE TABLE "FinanceVendorBillAttachment" (
    "id" TEXT NOT NULL,
    "billId" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "storageName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "uploadedBy" TEXT NOT NULL DEFAULT 'Admin',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FinanceVendorBillAttachment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FinanceVendorBillAttachment_storageName_key"
ON "FinanceVendorBillAttachment"("storageName");

CREATE INDEX "FinanceVendorBillAttachment_billId_createdAt_idx"
ON "FinanceVendorBillAttachment"("billId", "createdAt");

ALTER TABLE "FinanceVendorBillAttachment"
ADD CONSTRAINT "FinanceVendorBillAttachment_billId_fkey"
FOREIGN KEY ("billId") REFERENCES "FinanceVendorBill"("id")
ON DELETE CASCADE ON UPDATE CASCADE;