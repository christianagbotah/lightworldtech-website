-- Phase 10 admin governance and audit.
-- Additive audit table plus one-time promotion when no super-admin exists.

PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS "AdminAuditLog" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "adminId" TEXT,
  "adminEmail" TEXT NOT NULL DEFAULT '',
  "adminName" TEXT NOT NULL DEFAULT '',
  "action" TEXT NOT NULL,
  "entity" TEXT NOT NULL DEFAULT '',
  "entityId" TEXT NOT NULL DEFAULT '',
  "details" TEXT NOT NULL DEFAULT '{}',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdminAuditLog_adminId_fkey"
    FOREIGN KEY ("adminId") REFERENCES "Admin" ("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "AdminAuditLog_createdAt_idx"
  ON "AdminAuditLog"("createdAt");

CREATE INDEX IF NOT EXISTS "AdminAuditLog_adminId_createdAt_idx"
  ON "AdminAuditLog"("adminId","createdAt");

CREATE INDEX IF NOT EXISTS "AdminAuditLog_action_createdAt_idx"
  ON "AdminAuditLog"("action","createdAt");

CREATE INDEX IF NOT EXISTS "AdminAuditLog_entity_entityId_idx"
  ON "AdminAuditLog"("entity","entityId");

UPDATE "Admin"
SET "role" = 'super_admin'
WHERE "id" = (
  SELECT "id"
  FROM "Admin"
  WHERE "active" = 1
  ORDER BY "createdAt" ASC
  LIMIT 1
)
AND NOT EXISTS (
  SELECT 1 FROM "Admin" WHERE "role" = 'super_admin' AND "active" = 1
);
