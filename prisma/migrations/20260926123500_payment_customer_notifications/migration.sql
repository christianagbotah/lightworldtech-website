ALTER TABLE "ClientPayment"
  ADD COLUMN "customerNotificationStatus" TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN "customerNotificationAttemptedAt" TIMESTAMP(3),
  ADD COLUMN "customerNotificationCompletedAt" TIMESTAMP(3),
  ADD COLUMN "customerNotificationChannels" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "customerNotificationError" TEXT NOT NULL DEFAULT '';
