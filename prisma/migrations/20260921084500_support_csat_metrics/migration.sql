ALTER TABLE "ClientSupportTicket"
  ADD COLUMN "clientRating" INTEGER,
  ADD COLUMN "clientFeedback" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "ratedAt" TIMESTAMP(3);

ALTER TABLE "ClientSupportTicket"
  ADD CONSTRAINT "ClientSupportTicket_clientRating_check"
  CHECK ("clientRating" IS NULL OR ("clientRating" >= 1 AND "clientRating" <= 5));

CREATE INDEX "ClientSupportTicket_clientRating_ratedAt_idx"
  ON "ClientSupportTicket"("clientRating", "ratedAt");
