CREATE TABLE "FinancePurchaseRequest" (
  "id" TEXT NOT NULL,
  "requestNumber" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "vendorId" TEXT,
  "projectId" TEXT,
  "currency" TEXT NOT NULL DEFAULT 'GHS',
  "estimatedAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "neededBy" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'submitted',
  "requestedByAdminId" TEXT NOT NULL,
  "requestedByName" TEXT NOT NULL DEFAULT '',
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "decidedByAdminId" TEXT NOT NULL DEFAULT '',
  "decidedByName" TEXT NOT NULL DEFAULT '',
  "decidedAt" TIMESTAMP(3),
  "decisionNotes" TEXT NOT NULL DEFAULT '',
  "convertedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FinancePurchaseRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FinancePurchaseRequestLine" (
  "id" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "quantity" DECIMAL(12,3) NOT NULL,
  "unitPrice" DECIMAL(18,2) NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FinancePurchaseRequestLine_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FinancePurchaseOrder" (
  "id" TEXT NOT NULL,
  "poNumber" TEXT NOT NULL,
  "requestId" TEXT,
  "vendorId" TEXT NOT NULL,
  "projectId" TEXT,
  "currency" TEXT NOT NULL DEFAULT 'GHS',
  "total" DECIMAL(18,2) NOT NULL,
  "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expectedDate" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'issued',
  "notes" TEXT NOT NULL DEFAULT '',
  "issuedBy" TEXT NOT NULL DEFAULT 'Admin',
  "receivedAt" TIMESTAMP(3),
  "receivedBy" TEXT NOT NULL DEFAULT '',
  "closedAt" TIMESTAMP(3),
  "closedBy" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FinancePurchaseOrder_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FinancePurchaseRequest_requestNumber_key" ON "FinancePurchaseRequest"("requestNumber");
CREATE INDEX "FinancePurchaseRequest_status_submittedAt_idx" ON "FinancePurchaseRequest"("status", "submittedAt");
CREATE INDEX "FinancePurchaseRequest_vendorId_status_idx" ON "FinancePurchaseRequest"("vendorId", "status");
CREATE INDEX "FinancePurchaseRequest_projectId_status_idx" ON "FinancePurchaseRequest"("projectId", "status");

CREATE INDEX "FinancePurchaseRequestLine_requestId_idx" ON "FinancePurchaseRequestLine"("requestId");

CREATE UNIQUE INDEX "FinancePurchaseOrder_poNumber_key" ON "FinancePurchaseOrder"("poNumber");
CREATE UNIQUE INDEX "FinancePurchaseOrder_requestId_key" ON "FinancePurchaseOrder"("requestId");
CREATE INDEX "FinancePurchaseOrder_vendorId_status_idx" ON "FinancePurchaseOrder"("vendorId", "status");
CREATE INDEX "FinancePurchaseOrder_projectId_status_idx" ON "FinancePurchaseOrder"("projectId", "status");
CREATE INDEX "FinancePurchaseOrder_status_expectedDate_idx" ON "FinancePurchaseOrder"("status", "expectedDate");

ALTER TABLE "FinancePurchaseRequest"
ADD CONSTRAINT "FinancePurchaseRequest_vendorId_fkey"
FOREIGN KEY ("vendorId") REFERENCES "FinanceVendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "FinancePurchaseRequest"
ADD CONSTRAINT "FinancePurchaseRequest_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "ClientProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "FinancePurchaseRequestLine"
ADD CONSTRAINT "FinancePurchaseRequestLine_requestId_fkey"
FOREIGN KEY ("requestId") REFERENCES "FinancePurchaseRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FinancePurchaseOrder"
ADD CONSTRAINT "FinancePurchaseOrder_requestId_fkey"
FOREIGN KEY ("requestId") REFERENCES "FinancePurchaseRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "FinancePurchaseOrder"
ADD CONSTRAINT "FinancePurchaseOrder_vendorId_fkey"
FOREIGN KEY ("vendorId") REFERENCES "FinanceVendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "FinancePurchaseOrder"
ADD CONSTRAINT "FinancePurchaseOrder_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "ClientProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
