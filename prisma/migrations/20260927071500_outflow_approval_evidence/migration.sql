CREATE TABLE "FinanceOutflowApprovalAttachment" (
    "id" TEXT NOT NULL,
    "approvalId" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "storageName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "uploadedBy" TEXT NOT NULL DEFAULT 'Admin',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FinanceOutflowApprovalAttachment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FinanceOutflowApprovalAttachment_storageName_key"
ON "FinanceOutflowApprovalAttachment"("storageName");

CREATE INDEX "FinanceOutflowApprovalAttachment_approvalId_createdAt_idx"
ON "FinanceOutflowApprovalAttachment"("approvalId", "createdAt");

ALTER TABLE "FinanceOutflowApprovalAttachment"
ADD CONSTRAINT "FinanceOutflowApprovalAttachment_approvalId_fkey"
FOREIGN KEY ("approvalId") REFERENCES "FinanceOutflowApproval"("id")
ON DELETE CASCADE ON UPDATE CASCADE;