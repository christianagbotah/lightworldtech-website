ALTER TABLE "FinanceVendorBill"
ADD COLUMN "purchaseOrderId" TEXT;

CREATE UNIQUE INDEX "FinanceVendorBill_purchaseOrderId_key"
ON "FinanceVendorBill"("purchaseOrderId");

ALTER TABLE "FinanceVendorBill"
ADD CONSTRAINT "FinanceVendorBill_purchaseOrderId_fkey"
FOREIGN KEY ("purchaseOrderId") REFERENCES "FinancePurchaseOrder"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
