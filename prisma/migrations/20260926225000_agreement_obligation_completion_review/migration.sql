ALTER TABLE "ClientAgreementObligation"
ADD COLUMN "completionSubmittedAt" TIMESTAMP(3),
ADD COLUMN "completionSubmittedByAdminId" TEXT,
ADD COLUMN "completionSubmittedBy" TEXT NOT NULL DEFAULT '',
ADD COLUMN "reviewedAt" TIMESTAMP(3),
ADD COLUMN "reviewedByAdminId" TEXT,
ADD COLUMN "reviewedBy" TEXT NOT NULL DEFAULT '',
ADD COLUMN "reviewNotes" TEXT NOT NULL DEFAULT '';