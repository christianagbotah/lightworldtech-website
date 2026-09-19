-- Phase 7 secure client portal schema upgrade.
-- Additive and idempotent. Existing CMS/CRM/proposal data is untouched.

PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS "PortalClient" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "companyName" TEXT NOT NULL,
  "contactName" TEXT NOT NULL,
  "email" TEXT NOT NULL UNIQUE,
  "password" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT 1,
  "lastLogin" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "ClientProject" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "clientId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "summary" TEXT NOT NULL DEFAULT '',
  "progress" INTEGER NOT NULL DEFAULT 0,
  "startDate" DATETIME,
  "targetDate" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClientProject_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "PortalClient" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "ClientMilestone" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "status" TEXT NOT NULL DEFAULT 'pending',
  "dueDate" DATETIME,
  "order" INTEGER NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClientMilestone_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "ClientProject" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "ClientDeliverable" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "url" TEXT NOT NULL DEFAULT '',
  "status" TEXT NOT NULL DEFAULT 'available',
  "deliveredAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClientDeliverable_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "ClientProject" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "ClientTicket" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "clientId" TEXT NOT NULL,
  "projectId" TEXT,
  "subject" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'open',
  "priority" TEXT NOT NULL DEFAULT 'normal',
  "adminResponse" TEXT NOT NULL DEFAULT '',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClientTicket_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "PortalClient" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ClientTicket_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "ClientProject" ("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "ClientProject_clientId_status_idx"
  ON "ClientProject"("clientId", "status");
CREATE INDEX IF NOT EXISTS "ClientMilestone_projectId_order_idx"
  ON "ClientMilestone"("projectId", "order");
CREATE INDEX IF NOT EXISTS "ClientDeliverable_projectId_createdAt_idx"
  ON "ClientDeliverable"("projectId", "createdAt");
CREATE INDEX IF NOT EXISTS "ClientTicket_clientId_status_idx"
  ON "ClientTicket"("clientId", "status");
CREATE INDEX IF NOT EXISTS "ClientTicket_projectId_status_idx"
  ON "ClientTicket"("projectId", "status");
