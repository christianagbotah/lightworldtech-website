ALTER TABLE "FinanceExpense"
  ADD COLUMN "organizationId" TEXT,
  ADD COLUMN "projectId" TEXT,
  ADD COLUMN "serviceId" TEXT;

ALTER TABLE "FinanceExpense"
  ADD CONSTRAINT "FinanceExpense_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "ClientOrganization"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "FinanceExpense"
  ADD CONSTRAINT "FinanceExpense_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "ClientProject"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "FinanceExpense"
  ADD CONSTRAINT "FinanceExpense_serviceId_fkey"
  FOREIGN KEY ("serviceId") REFERENCES "ClientServiceAccount"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "FinanceExpense_organizationId_incurredAt_idx"
  ON "FinanceExpense"("organizationId", "incurredAt");

CREATE INDEX "FinanceExpense_projectId_incurredAt_idx"
  ON "FinanceExpense"("projectId", "incurredAt");

CREATE INDEX "FinanceExpense_serviceId_incurredAt_idx"
  ON "FinanceExpense"("serviceId", "incurredAt");
