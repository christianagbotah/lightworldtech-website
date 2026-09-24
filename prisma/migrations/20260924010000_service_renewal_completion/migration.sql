ALTER TABLE "ClientInvoice"
  ADD COLUMN "renewalCompletedAt" TIMESTAMP(3),
  ADD COLUMN "renewalCompletedBy" TEXT NOT NULL DEFAULT '';

ALTER TABLE "ClientServiceChange"
  ADD COLUMN "sourceInvoiceId" TEXT,
  ADD COLUMN "previousExpiryDate" TIMESTAMP(3),
  ADD COLUMN "newExpiryDate" TIMESTAMP(3),
  ADD COLUMN "previousNextDueDate" TIMESTAMP(3),
  ADD COLUMN "newNextDueDate" TIMESTAMP(3),
  ADD COLUMN "previousStatus" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "newStatus" TEXT NOT NULL DEFAULT '';

CREATE UNIQUE INDEX "ClientServiceChange_sourceInvoiceId_key"
  ON "ClientServiceChange"("sourceInvoiceId");
