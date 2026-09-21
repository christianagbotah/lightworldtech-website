ALTER TABLE "ClientPortalUser"
ADD COLUMN "authVersion" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "ClientPasswordResetToken" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClientPasswordResetToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClientPasswordResetToken_tokenHash_key"
ON "ClientPasswordResetToken"("tokenHash");

CREATE INDEX "ClientPasswordResetToken_userId_createdAt_idx"
ON "ClientPasswordResetToken"("userId", "createdAt");

CREATE INDEX "ClientPasswordResetToken_expiresAt_idx"
ON "ClientPasswordResetToken"("expiresAt");

ALTER TABLE "ClientPasswordResetToken"
ADD CONSTRAINT "ClientPasswordResetToken_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "ClientPortalUser"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
