CREATE TABLE "FinanceVendorPaymentAttachment" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "storageName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "uploadedBy" TEXT NOT NULL DEFAULT 'Admin',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FinanceVendorPaymentAttachment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FinanceVendorPaymentAttachment_storageName_key"
ON "FinanceVendorPaymentAttachment"("storageName");

CREATE INDEX "FinanceVendorPaymentAttachment_paymentId_createdAt_idx"
ON "FinanceVendorPaymentAttachment"("paymentId", "createdAt");

ALTER TABLE "FinanceVendorPaymentAttachment"
ADD CONSTRAINT "FinanceVendorPaymentAttachment_paymentId_fkey"
FOREIGN KEY ("paymentId") REFERENCES "FinanceVendorPayment"("id")
ON DELETE CASCADE ON UPDATE CASCADE;