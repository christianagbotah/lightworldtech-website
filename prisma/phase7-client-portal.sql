-- Phase 7 secure client portal foundation.
-- Additive and idempotent. No existing CRM, proposal, CMS or analytics tables are modified.

PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS "ClientPortalAccount" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "leadId" TEXT UNIQUE,
  "email" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "organization" TEXT NOT NULL DEFAULT '',
  "password" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT 1,
  "mustChangePassword" BOOLEAN NOT NULL DEFAULT 1,
  "sessionVersion" INTEGER NOT NULL DEFAULT 1,
  "lastLogin" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClientPortalAccount_leadId_fkey"
    FOREIGN KEY ("leadId") REFERENCES "Lead" ("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "ClientProject" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "accountId" TEXT NOT NULL,
  "proposalId" TEXT UNIQUE,
  "title" TEXT NOT NULL,
  "summary" TEXT NOT NULL DEFAULT '',
  "status" TEXT NOT NULL DEFAULT 'planning',
  "progress" INTEGER NOT NULL DEFAULT 0,
  "startDate" DATETIME,
  "targetDate" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClientProject_accountId_fkey"
    FOREIGN KEY ("accountId") REFERENCES "ClientPortalAccount" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ClientProject_proposalId_fkey"
    FOREIGN KEY ("proposalId") REFERENCES "Proposal" ("id")
    ON DELETE SET NULL ON UPDATE CASCADE
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

CREATE TABLE IF NOT EXISTS "ClientDocument" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "category" TEXT NOT NULL DEFAULT 'general',
  "visible" BOOLEAN NOT NULL DEFAULT 1,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClientDocument_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "ClientProject" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "ClientTicket" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "accountId" TEXT NOT NULL,
  "projectId" TEXT,
  "subject" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'open',
  "priority" TEXT NOT NULL DEFAULT 'normal',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClientTicket_accountId_fkey"
    FOREIGN KEY ("accountId") REFERENCES "ClientPortalAccount" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ClientTicket_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "ClientProject" ("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "ClientTicketMessage" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "ticketId" TEXT NOT NULL,
  "authorType" TEXT NOT NULL,
  "authorName" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClientTicketMessage_ticketId_fkey"
    FOREIGN KEY ("ticketId") REFERENCES "ClientTicket" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "ClientPortalAccount_active_updatedAt_idx"
  ON "ClientPortalAccount"("active", "updatedAt");
CREATE INDEX IF NOT EXISTS "ClientProject_accountId_updatedAt_idx"
  ON "ClientProject"("accountId", "updatedAt");
CREATE INDEX IF NOT EXISTS "ClientProject_status_updatedAt_idx"
  ON "ClientProject"("status", "updatedAt");
CREATE INDEX IF NOT EXISTS "ClientMilestone_projectId_order_idx"
  ON "ClientMilestone"("projectId", "order");
CREATE INDEX IF NOT EXISTS "ClientDocument_projectId_visible_updatedAt_idx"
  ON "ClientDocument"("projectId", "visible", "updatedAt");
CREATE INDEX IF NOT EXISTS "ClientTicket_accountId_status_updatedAt_idx"
  ON "ClientTicket"("accountId", "status", "updatedAt");
CREATE INDEX IF NOT EXISTS "ClientTicket_projectId_updatedAt_idx"
  ON "ClientTicket"("projectId", "updatedAt");
CREATE INDEX IF NOT EXISTS "ClientTicketMessage_ticketId_createdAt_idx"
  ON "ClientTicketMessage"("ticketId", "createdAt");


CREATE TABLE IF NOT EXISTS "ClientAnnouncement" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "accountId" TEXT,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT 1,
  "publishedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClientAnnouncement_accountId_fkey"
    FOREIGN KEY ("accountId") REFERENCES "ClientPortalAccount" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "ClientAnnouncement_accountId_active_publishedAt_idx"
  ON "ClientAnnouncement"("accountId", "active", "publishedAt");
