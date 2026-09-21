CREATE SEQUENCE IF NOT EXISTS "client_invoice_number_seq" START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS "client_payment_number_seq" START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS "finance_payable_number_seq" START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS "finance_vendor_payment_number_seq" START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS "finance_expense_number_seq" START WITH 1 INCREMENT BY 1;

CREATE TABLE "ClientServiceAccount" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "projectId" TEXT,
  "name" TEXT NOT NULL,
  "serviceType" TEXT NOT NULL DEFAULT 'managed_service',
  "planName" TEXT NOT NULL DEFAULT '',
  "status" TEXT NOT NULL DEFAULT 'active',
  "billingCycle" TEXT NOT NULL DEFAULT 'annual',
  "currency" TEXT NOT NULL DEFAULT 'GHS',
  "recurringAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "startDate" TIMESTAMP(3) NOT NULL,
  "expiryDate" TIMESTAMP(3),
  "nextDueDate" TIMESTAMP(3),
  "autoRenew" BOOLEAN NOT NULL DEFAULT false,
  "renewalNoticeDays" INTEGER NOT NULL DEFAULT 30,
  "notes" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ClientServiceAccount_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ClientServiceAccount_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "ClientOrganization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ClientServiceAccount_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "ClientProject"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "ClientServiceChange" (
  "id" TEXT NOT NULL,
  "serviceId" TEXT NOT NULL,
  "changeType" TEXT NOT NULL,
  "previousPlan" TEXT NOT NULL DEFAULT '',
  "newPlan" TEXT NOT NULL DEFAULT '',
  "previousAmount" DECIMAL(18,2),
  "newAmount" DECIMAL(18,2),
  "effectiveAt" TIMESTAMP(3) NOT NULL,
  "notes" TEXT NOT NULL DEFAULT '',
  "changedBy" TEXT NOT NULL DEFAULT 'Admin',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ClientServiceChange_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ClientServiceChange_serviceId_fkey"
    FOREIGN KEY ("serviceId") REFERENCES "ClientServiceAccount"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "ClientInvoice" (
  "id" TEXT NOT NULL,
  "invoiceNumber" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "serviceId" TEXT,
  "projectId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "currency" TEXT NOT NULL DEFAULT 'GHS',
  "issueDate" TIMESTAMP(3) NOT NULL,
  "dueDate" TIMESTAMP(3) NOT NULL,
  "subtotal" DECIMAL(18,2) NOT NULL,
  "discount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "tax" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "total" DECIMAL(18,2) NOT NULL,
  "notes" TEXT NOT NULL DEFAULT '',
  "createdBy" TEXT NOT NULL DEFAULT 'Admin',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ClientInvoice_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ClientInvoice_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "ClientOrganization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ClientInvoice_serviceId_fkey"
    FOREIGN KEY ("serviceId") REFERENCES "ClientServiceAccount"("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "ClientInvoice_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "ClientProject"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "ClientInvoiceLine" (
  "id" TEXT NOT NULL,
  "invoiceId" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "quantity" DECIMAL(12,2) NOT NULL DEFAULT 1,
  "unitPrice" DECIMAL(18,2) NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ClientInvoiceLine_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ClientInvoiceLine_invoiceId_fkey"
    FOREIGN KEY ("invoiceId") REFERENCES "ClientInvoice"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "ClientPayment" (
  "id" TEXT NOT NULL,
  "paymentNumber" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'GHS',
  "amount" DECIMAL(18,2) NOT NULL,
  "paidAt" TIMESTAMP(3) NOT NULL,
  "method" TEXT NOT NULL DEFAULT 'bank_transfer',
  "reference" TEXT NOT NULL DEFAULT '',
  "notes" TEXT NOT NULL DEFAULT '',
  "receivedBy" TEXT NOT NULL DEFAULT 'Admin',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ClientPayment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ClientPayment_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "ClientOrganization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "ClientPaymentAllocation" (
  "id" TEXT NOT NULL,
  "paymentId" TEXT NOT NULL,
  "invoiceId" TEXT NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ClientPaymentAllocation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ClientPaymentAllocation_paymentId_fkey"
    FOREIGN KEY ("paymentId") REFERENCES "ClientPayment"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ClientPaymentAllocation_invoiceId_fkey"
    FOREIGN KEY ("invoiceId") REFERENCES "ClientInvoice"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "FinanceVendor" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL DEFAULT '',
  "phone" TEXT NOT NULL DEFAULT '',
  "taxId" TEXT NOT NULL DEFAULT '',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "notes" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "FinanceVendor_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FinanceVendorBill" (
  "id" TEXT NOT NULL,
  "payableNumber" TEXT NOT NULL,
  "vendorId" TEXT NOT NULL,
  "vendorReference" TEXT NOT NULL DEFAULT '',
  "category" TEXT NOT NULL DEFAULT 'operating_expense',
  "status" TEXT NOT NULL DEFAULT 'unpaid',
  "currency" TEXT NOT NULL DEFAULT 'GHS',
  "issueDate" TIMESTAMP(3) NOT NULL,
  "dueDate" TIMESTAMP(3) NOT NULL,
  "total" DECIMAL(18,2) NOT NULL,
  "notes" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "FinanceVendorBill_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FinanceVendorBill_vendorId_fkey"
    FOREIGN KEY ("vendorId") REFERENCES "FinanceVendor"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "FinanceVendorPayment" (
  "id" TEXT NOT NULL,
  "paymentNumber" TEXT NOT NULL,
  "vendorId" TEXT NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'GHS',
  "amount" DECIMAL(18,2) NOT NULL,
  "paidAt" TIMESTAMP(3) NOT NULL,
  "method" TEXT NOT NULL DEFAULT 'bank_transfer',
  "reference" TEXT NOT NULL DEFAULT '',
  "notes" TEXT NOT NULL DEFAULT '',
  "paidBy" TEXT NOT NULL DEFAULT 'Admin',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "FinanceVendorPayment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FinanceVendorPayment_vendorId_fkey"
    FOREIGN KEY ("vendorId") REFERENCES "FinanceVendor"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "FinanceVendorPaymentAllocation" (
  "id" TEXT NOT NULL,
  "paymentId" TEXT NOT NULL,
  "billId" TEXT NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "FinanceVendorPaymentAllocation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FinanceVendorPaymentAllocation_paymentId_fkey"
    FOREIGN KEY ("paymentId") REFERENCES "FinanceVendorPayment"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "FinanceVendorPaymentAllocation_billId_fkey"
    FOREIGN KEY ("billId") REFERENCES "FinanceVendorBill"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "FinanceExpense" (
  "id" TEXT NOT NULL,
  "expenseNumber" TEXT NOT NULL,
  "vendorId" TEXT,
  "category" TEXT NOT NULL DEFAULT 'operating_expense',
  "description" TEXT NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'GHS',
  "amount" DECIMAL(18,2) NOT NULL,
  "incurredAt" TIMESTAMP(3) NOT NULL,
  "paidAt" TIMESTAMP(3),
  "method" TEXT NOT NULL DEFAULT '',
  "reference" TEXT NOT NULL DEFAULT '',
  "notes" TEXT NOT NULL DEFAULT '',
  "recordedBy" TEXT NOT NULL DEFAULT 'Admin',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "FinanceExpense_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FinanceExpense_vendorId_fkey"
    FOREIGN KEY ("vendorId") REFERENCES "FinanceVendor"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ClientInvoice_invoiceNumber_key" ON "ClientInvoice"("invoiceNumber");
CREATE UNIQUE INDEX "ClientPayment_paymentNumber_key" ON "ClientPayment"("paymentNumber");
CREATE UNIQUE INDEX "ClientPaymentAllocation_paymentId_invoiceId_key" ON "ClientPaymentAllocation"("paymentId","invoiceId");
CREATE UNIQUE INDEX "FinanceVendorBill_payableNumber_key" ON "FinanceVendorBill"("payableNumber");
CREATE UNIQUE INDEX "FinanceVendorPayment_paymentNumber_key" ON "FinanceVendorPayment"("paymentNumber");
CREATE UNIQUE INDEX "FinanceVendorPaymentAllocation_paymentId_billId_key" ON "FinanceVendorPaymentAllocation"("paymentId","billId");
CREATE UNIQUE INDEX "FinanceExpense_expenseNumber_key" ON "FinanceExpense"("expenseNumber");

CREATE INDEX "ClientServiceAccount_organizationId_status_idx" ON "ClientServiceAccount"("organizationId","status");
CREATE INDEX "ClientServiceAccount_projectId_idx" ON "ClientServiceAccount"("projectId");
CREATE INDEX "ClientServiceAccount_expiryDate_idx" ON "ClientServiceAccount"("expiryDate");
CREATE INDEX "ClientServiceAccount_nextDueDate_idx" ON "ClientServiceAccount"("nextDueDate");
CREATE INDEX "ClientServiceChange_serviceId_effectiveAt_idx" ON "ClientServiceChange"("serviceId","effectiveAt");
CREATE INDEX "ClientServiceChange_changeType_effectiveAt_idx" ON "ClientServiceChange"("changeType","effectiveAt");
CREATE INDEX "ClientInvoice_organizationId_status_idx" ON "ClientInvoice"("organizationId","status");
CREATE INDEX "ClientInvoice_serviceId_dueDate_idx" ON "ClientInvoice"("serviceId","dueDate");
CREATE INDEX "ClientInvoice_projectId_idx" ON "ClientInvoice"("projectId");
CREATE INDEX "ClientInvoice_dueDate_status_idx" ON "ClientInvoice"("dueDate","status");
CREATE INDEX "ClientInvoice_issueDate_idx" ON "ClientInvoice"("issueDate");
CREATE INDEX "ClientInvoiceLine_invoiceId_order_idx" ON "ClientInvoiceLine"("invoiceId","order");
CREATE INDEX "ClientPayment_organizationId_paidAt_idx" ON "ClientPayment"("organizationId","paidAt");
CREATE INDEX "ClientPayment_paidAt_idx" ON "ClientPayment"("paidAt");
CREATE INDEX "ClientPaymentAllocation_invoiceId_idx" ON "ClientPaymentAllocation"("invoiceId");
CREATE INDEX "FinanceVendor_name_idx" ON "FinanceVendor"("name");
CREATE INDEX "FinanceVendor_active_idx" ON "FinanceVendor"("active");
CREATE INDEX "FinanceVendorBill_vendorId_status_idx" ON "FinanceVendorBill"("vendorId","status");
CREATE INDEX "FinanceVendorBill_dueDate_status_idx" ON "FinanceVendorBill"("dueDate","status");
CREATE INDEX "FinanceVendorBill_issueDate_idx" ON "FinanceVendorBill"("issueDate");
CREATE INDEX "FinanceVendorPayment_vendorId_paidAt_idx" ON "FinanceVendorPayment"("vendorId","paidAt");
CREATE INDEX "FinanceVendorPayment_paidAt_idx" ON "FinanceVendorPayment"("paidAt");
CREATE INDEX "FinanceVendorPaymentAllocation_billId_idx" ON "FinanceVendorPaymentAllocation"("billId");
CREATE INDEX "FinanceExpense_vendorId_incurredAt_idx" ON "FinanceExpense"("vendorId","incurredAt");
CREATE INDEX "FinanceExpense_category_incurredAt_idx" ON "FinanceExpense"("category","incurredAt");
CREATE INDEX "FinanceExpense_paidAt_idx" ON "FinanceExpense"("paidAt");
