ALTER TABLE "ClientProject"
  ADD COLUMN "expiryDate" TIMESTAMP(3),
  ADD COLUMN "nextRenewalDate" TIMESTAMP(3),
  ADD COLUMN "renewalCycle" TEXT NOT NULL DEFAULT 'annual',
  ADD COLUMN "renewalCurrency" TEXT NOT NULL DEFAULT 'GHS',
  ADD COLUMN "renewalAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN "autoRenew" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "renewalNoticeDays" INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN "renewalNotes" TEXT NOT NULL DEFAULT '';

ALTER TABLE "ClientProject"
  ADD CONSTRAINT "ClientProject_valid_renewal_cycle"
  CHECK ("renewalCycle" IN ('monthly', 'quarterly', 'semiannual', 'annual', 'one_time', 'custom'));

ALTER TABLE "ClientProject"
  ADD CONSTRAINT "ClientProject_nonnegative_renewal_amount"
  CHECK ("renewalAmount" >= 0);

ALTER TABLE "ClientProject"
  ADD CONSTRAINT "ClientProject_valid_renewal_notice_days"
  CHECK ("renewalNoticeDays" >= 0 AND "renewalNoticeDays" <= 365);

CREATE INDEX "ClientProject_expiryDate_idx" ON "ClientProject"("expiryDate");
CREATE INDEX "ClientProject_nextRenewalDate_idx" ON "ClientProject"("nextRenewalDate");
