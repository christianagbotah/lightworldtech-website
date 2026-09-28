ALTER TABLE "ClientAgreementBillingMilestone"
ADD COLUMN "readinessStatus" TEXT NOT NULL DEFAULT 'planned',
ADD COLUMN "readinessNote" TEXT NOT NULL DEFAULT '',
ADD COLUMN "evidenceUrl" TEXT NOT NULL DEFAULT '',
ADD COLUMN "readyAt" TIMESTAMP(3),
ADD COLUMN "readyBy" TEXT NOT NULL DEFAULT '';

CREATE INDEX "ClientAgreementBillingMilestone_readinessStatus_dueDate_idx"
ON "ClientAgreementBillingMilestone"("readinessStatus", "dueDate");
