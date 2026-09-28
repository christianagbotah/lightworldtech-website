ALTER TABLE "ClientInvoice"
ADD COLUMN "createdByAdminId" TEXT NOT NULL DEFAULT '',
ADD COLUMN "issuedByAdminId" TEXT NOT NULL DEFAULT '',
ADD COLUMN "issuedBy" TEXT NOT NULL DEFAULT '',
ADD COLUMN "issuedAt" TIMESTAMP(3);

UPDATE "ClientInvoice"
SET "createdByAdminId" = ''
WHERE "createdByAdminId" IS NULL;
