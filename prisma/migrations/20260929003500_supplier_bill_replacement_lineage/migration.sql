ALTER TABLE "FinanceVendorBill"
ADD COLUMN "replacesBillId" TEXT;

CREATE UNIQUE INDEX "FinanceVendorBill_replacesBillId_key"
ON "FinanceVendorBill"("replacesBillId");

ALTER TABLE "FinanceVendorBill"
ADD CONSTRAINT "FinanceVendorBill_replacesBillId_fkey"
FOREIGN KEY ("replacesBillId") REFERENCES "FinanceVendorBill"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
