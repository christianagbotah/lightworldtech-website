CREATE TABLE "FinanceSupplierQuote" (
  "id" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "vendorId" TEXT NOT NULL,
  "quoteReference" TEXT NOT NULL DEFAULT '',
  "currency" TEXT NOT NULL DEFAULT 'GHS',
  "total" DECIMAL(18,2) NOT NULL,
  "leadTimeDays" INTEGER,
  "validUntil" TIMESTAMP(3),
  "notes" TEXT NOT NULL DEFAULT '',
  "selected" BOOLEAN NOT NULL DEFAULT false,
  "selectedAt" TIMESTAMP(3),
  "selectedById" TEXT NOT NULL DEFAULT '',
  "selectedByName" TEXT NOT NULL DEFAULT '',
  "createdById" TEXT NOT NULL,
  "createdByName" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FinanceSupplierQuote_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FinanceSupplierQuote_requestId_selected_idx" ON "FinanceSupplierQuote"("requestId", "selected");
CREATE INDEX "FinanceSupplierQuote_vendorId_createdAt_idx" ON "FinanceSupplierQuote"("vendorId", "createdAt");
CREATE INDEX "FinanceSupplierQuote_validUntil_idx" ON "FinanceSupplierQuote"("validUntil");

ALTER TABLE "FinanceSupplierQuote"
ADD CONSTRAINT "FinanceSupplierQuote_requestId_fkey"
FOREIGN KEY ("requestId") REFERENCES "FinancePurchaseRequest"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FinanceSupplierQuote"
ADD CONSTRAINT "FinanceSupplierQuote_vendorId_fkey"
FOREIGN KEY ("vendorId") REFERENCES "FinanceVendor"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
