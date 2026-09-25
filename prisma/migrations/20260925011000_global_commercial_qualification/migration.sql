ALTER TABLE "Lead"
  ADD COLUMN "company" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "industry" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "countryRegion" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "timezone" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "serviceInterest" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "currency" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "budgetRange" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "deliveryWindow" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "engagementModel" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "international" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "expectedRevenue" DECIMAL(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN "probability" INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN "nextAction" TEXT NOT NULL DEFAULT '';

CREATE INDEX "Lead_international_updatedAt_idx" ON "Lead"("international", "updatedAt");
CREATE INDEX "Lead_industry_updatedAt_idx" ON "Lead"("industry", "updatedAt");
CREATE INDEX "Lead_countryRegion_updatedAt_idx" ON "Lead"("countryRegion", "updatedAt");
