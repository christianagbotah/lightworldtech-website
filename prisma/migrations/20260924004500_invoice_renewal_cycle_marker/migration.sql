ALTER TABLE "ClientInvoice"
  ADD COLUMN "renewalForDate" TIMESTAMP(3);

CREATE INDEX "ClientInvoice_serviceId_renewalForDate_idx"
  ON "ClientInvoice"("serviceId", "renewalForDate");
