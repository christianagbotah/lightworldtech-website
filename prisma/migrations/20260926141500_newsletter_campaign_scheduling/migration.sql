ALTER TABLE "NewsletterCampaign"
  ADD COLUMN "scheduledAt" TIMESTAMP(3);

CREATE INDEX "NewsletterCampaign_status_scheduledAt_idx"
  ON "NewsletterCampaign"("status", "scheduledAt");
