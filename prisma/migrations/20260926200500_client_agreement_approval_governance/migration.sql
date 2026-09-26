ALTER TABLE "ClientAgreement"
ADD COLUMN "approvalStatus" TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN "approvalDecisionBy" TEXT NOT NULL DEFAULT '',
ADD COLUMN "approvalDecisionAt" TIMESTAMP(3),
ADD COLUMN "approvalNotes" TEXT NOT NULL DEFAULT '';

UPDATE "ClientAgreement"
SET
  "approvalStatus" = CASE WHEN "status" = 'active' THEN 'approved' ELSE 'pending' END,
  "approvalDecisionBy" = CASE WHEN "status" = 'active' THEN 'Legacy migration' ELSE '' END,
  "approvalDecisionAt" = CASE WHEN "status" = 'active' THEN COALESCE("signedAt", "createdAt") ELSE NULL END;

CREATE INDEX "ClientAgreement_approvalStatus_updatedAt_idx"
ON "ClientAgreement"("approvalStatus", "updatedAt");