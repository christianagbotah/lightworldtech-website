-- Phase 13 secure administrator password recovery.
-- Adds session versioning plus hashed, single-use reset tokens.

PRAGMA foreign_keys=ON;

ALTER TABLE "Admin" ADD COLUMN "authVersion" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS "AdminPasswordResetToken" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "adminId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" DATETIME NOT NULL,
  "usedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdminPasswordResetToken_adminId_fkey"
    FOREIGN KEY ("adminId") REFERENCES "Admin" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "AdminPasswordResetToken_tokenHash_key"
  ON "AdminPasswordResetToken"("tokenHash");

CREATE INDEX IF NOT EXISTS "AdminPasswordResetToken_adminId_createdAt_idx"
  ON "AdminPasswordResetToken"("adminId","createdAt");

CREATE INDEX IF NOT EXISTS "AdminPasswordResetToken_expiresAt_idx"
  ON "AdminPasswordResetToken"("expiresAt");
