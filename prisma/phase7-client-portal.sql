-- Phase 7 secure client portal.
-- Additive and idempotent: creates client portal tables and indexes only.

PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS "ClientOrganization" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "primaryContactName" TEXT NOT NULL DEFAULT '',
  "primaryEmail" TEXT NOT NULL DEFAULT '',
  "primaryPhone" TEXT NOT NULL DEFAULT '',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "ClientPortalUser" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "email" TEXT NOT NULL UNIQUE,
  "password" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'client_admin',
  "active" BOOLEAN NOT NULL DEFAULT 1,
  "lastLogin" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClientPortalUser_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "ClientOrganization" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "ClientProject" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "summary" TEXT NOT NULL DEFAULT '',
  "status" TEXT NOT NULL DEFAULT 'planned',
  "health" TEXT NOT NULL DEFAULT 'on_track',
  "progress" INTEGER NOT NULL DEFAULT 0,
  "manager" TEXT NOT NULL DEFAULT '',
  "startDate" DATETIME,
  "targetDate" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClientProject_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "ClientOrganization" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "ClientMilestone" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "status" TEXT NOT NULL DEFAULT 'planned',
  "order" INTEGER NOT NULL DEFAULT 0,
  "dueDate" DATETIME,
  "completedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClientMilestone_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "ClientProject" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "ClientSupportTicket" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "projectId" TEXT,
  "createdById" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'open',
  "priority" TEXT NOT NULL DEFAULT 'normal',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClientSupportTicket_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "ClientOrganization" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ClientSupportTicket_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "ClientProject" ("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "ClientSupportTicket_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "ClientPortalUser" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "ClientOrganization_status_updatedAt_idx" ON "ClientOrganization"("status","updatedAt");
CREATE INDEX IF NOT EXISTS "ClientOrganization_name_idx" ON "ClientOrganization"("name");
CREATE INDEX IF NOT EXISTS "ClientPortalUser_organizationId_active_idx" ON "ClientPortalUser"("organizationId","active");
CREATE INDEX IF NOT EXISTS "ClientProject_organizationId_status_idx" ON "ClientProject"("organizationId","status");
CREATE INDEX IF NOT EXISTS "ClientProject_targetDate_idx" ON "ClientProject"("targetDate");
CREATE INDEX IF NOT EXISTS "ClientMilestone_projectId_order_idx" ON "ClientMilestone"("projectId","order");
CREATE INDEX IF NOT EXISTS "ClientMilestone_dueDate_idx" ON "ClientMilestone"("dueDate");
CREATE INDEX IF NOT EXISTS "ClientSupportTicket_organizationId_status_idx" ON "ClientSupportTicket"("organizationId","status");
CREATE INDEX IF NOT EXISTS "ClientSupportTicket_projectId_status_idx" ON "ClientSupportTicket"("projectId","status");
CREATE INDEX IF NOT EXISTS "ClientSupportTicket_createdById_createdAt_idx" ON "ClientSupportTicket"("createdById","createdAt");
