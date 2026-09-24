CREATE TABLE "FinanceCollectionActivity" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "invoiceId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "note" TEXT NOT NULL DEFAULT '',
  "promisedAmount" DECIMAL(18,2),
  "promisedDate" TIMESTAMP(3),
  "nextFollowUpAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "smsMessageId" TEXT NOT NULL DEFAULT '',
  "createdBy" TEXT NOT NULL DEFAULT 'Admin',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "FinanceCollectionActivity_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "FinanceCollectionActivity"
  ADD CONSTRAINT "FinanceCollectionActivity_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "ClientOrganization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FinanceCollectionActivity"
  ADD CONSTRAINT "FinanceCollectionActivity_invoiceId_fkey"
  FOREIGN KEY ("invoiceId") REFERENCES "ClientInvoice"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "FinanceCollectionActivity_invoiceId_createdAt_idx"
  ON "FinanceCollectionActivity"("invoiceId", "createdAt");

CREATE INDEX "FinanceCollectionActivity_organizationId_createdAt_idx"
  ON "FinanceCollectionActivity"("organizationId", "createdAt");

CREATE INDEX "FinanceCollectionActivity_nextFollowUpAt_completedAt_idx"
  ON "FinanceCollectionActivity"("nextFollowUpAt", "completedAt");

CREATE INDEX "FinanceCollectionActivity_type_createdAt_idx"
  ON "FinanceCollectionActivity"("type", "createdAt");
