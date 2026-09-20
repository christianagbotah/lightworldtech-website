-- Fine-grained administrator permissions.
-- Existing ordinary administrators retain their previous broad access during rollout.
ALTER TABLE "Admin" ADD COLUMN "permissions" TEXT NOT NULL DEFAULT '[]';

UPDATE "Admin"
SET "permissions" = '["site.manage","crm.manage","proposals.manage","clients.manage","communications.manage"]'
WHERE "role" = 'admin';
