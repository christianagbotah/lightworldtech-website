CREATE TABLE "FinancePurchaseReceipt" (
  "id" TEXT NOT NULL,
  "receiptNumber" TEXT NOT NULL,
  "purchaseOrderId" TEXT NOT NULL,
  "notes" TEXT NOT NULL DEFAULT '',
  "receivedByAdminId" TEXT NOT NULL,
  "receivedByName" TEXT NOT NULL DEFAULT '',
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FinancePurchaseReceipt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FinancePurchaseReceiptLine" (
  "id" TEXT NOT NULL,
  "receiptId" TEXT NOT NULL,
  "requestLineId" TEXT NOT NULL,
  "quantity" DECIMAL(12,3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FinancePurchaseReceiptLine_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FinancePurchaseReceipt_receiptNumber_key" ON "FinancePurchaseReceipt"("receiptNumber");
CREATE INDEX "FinancePurchaseReceipt_purchaseOrderId_receivedAt_idx" ON "FinancePurchaseReceipt"("purchaseOrderId", "receivedAt");
CREATE INDEX "FinancePurchaseReceiptLine_receiptId_idx" ON "FinancePurchaseReceiptLine"("receiptId");
CREATE INDEX "FinancePurchaseReceiptLine_requestLineId_idx" ON "FinancePurchaseReceiptLine"("requestLineId");

ALTER TABLE "FinancePurchaseReceipt"
ADD CONSTRAINT "FinancePurchaseReceipt_purchaseOrderId_fkey"
FOREIGN KEY ("purchaseOrderId") REFERENCES "FinancePurchaseOrder"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FinancePurchaseReceiptLine"
ADD CONSTRAINT "FinancePurchaseReceiptLine_receiptId_fkey"
FOREIGN KEY ("receiptId") REFERENCES "FinancePurchaseReceipt"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FinancePurchaseReceiptLine"
ADD CONSTRAINT "FinancePurchaseReceiptLine_requestLineId_fkey"
FOREIGN KEY ("requestLineId") REFERENCES "FinancePurchaseRequestLine"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
