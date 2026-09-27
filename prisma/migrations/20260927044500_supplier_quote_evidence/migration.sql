CREATE TABLE "FinanceSupplierQuoteAttachment" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "storageName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "uploadedById" TEXT NOT NULL DEFAULT '',
    "uploadedByName" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FinanceSupplierQuoteAttachment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FinanceSupplierQuoteAttachment_storageName_key"
ON "FinanceSupplierQuoteAttachment"("storageName");

CREATE INDEX "FinanceSupplierQuoteAttachment_quoteId_createdAt_idx"
ON "FinanceSupplierQuoteAttachment"("quoteId", "createdAt");

ALTER TABLE "FinanceSupplierQuoteAttachment"
ADD CONSTRAINT "FinanceSupplierQuoteAttachment_quoteId_fkey"
FOREIGN KEY ("quoteId") REFERENCES "FinanceSupplierQuote"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
