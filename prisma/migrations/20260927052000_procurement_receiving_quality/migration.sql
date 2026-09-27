ALTER TABLE "FinancePurchaseReceiptLine"
ADD COLUMN "rejectedQuantity" DECIMAL(12,3) NOT NULL DEFAULT 0,
ADD COLUMN "inspectionNotes" TEXT NOT NULL DEFAULT '';