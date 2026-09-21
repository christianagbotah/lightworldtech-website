CREATE SEQUENCE IF NOT EXISTS "client_support_ticket_number_seq" START WITH 1 INCREMENT BY 1;

ALTER TABLE "ClientSupportTicket"
  ADD COLUMN "ticketNumber" TEXT,
  ADD COLUMN "category" TEXT NOT NULL DEFAULT 'general',
  ADD COLUMN "assignedTo" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "firstResponseDueAt" TIMESTAMP(3),
  ADD COLUMN "resolutionDueAt" TIMESTAMP(3),
  ADD COLUMN "firstRespondedAt" TIMESTAMP(3),
  ADD COLUMN "resolvedAt" TIMESTAMP(3),
  ADD COLUMN "escalatedAt" TIMESTAMP(3),
  ADD COLUMN "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "unreadByAdmin" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "unreadByClient" BOOLEAN NOT NULL DEFAULT false;

WITH numbered AS (
  SELECT
    "id",
    EXTRACT(YEAR FROM "createdAt")::INT AS ticket_year,
    ROW_NUMBER() OVER (ORDER BY "createdAt", "id") AS ticket_sequence
  FROM "ClientSupportTicket"
)
UPDATE "ClientSupportTicket" AS ticket
SET
  "ticketNumber" =
    'LWT-' || numbered.ticket_year::TEXT || '-' ||
    LPAD(numbered.ticket_sequence::TEXT, 5, '0'),
  "firstResponseDueAt" = ticket."createdAt" + INTERVAL '8 hours',
  "resolutionDueAt" = ticket."createdAt" + INTERVAL '72 hours',
  "lastActivityAt" = ticket."updatedAt",
  "unreadByAdmin" = false
FROM numbered
WHERE ticket."id" = numbered."id";

ALTER TABLE "ClientSupportTicket"
  ALTER COLUMN "ticketNumber" SET NOT NULL;

CREATE UNIQUE INDEX "ClientSupportTicket_ticketNumber_key"
  ON "ClientSupportTicket"("ticketNumber");

SELECT setval(
  '"client_support_ticket_number_seq"',
  GREATEST((SELECT COUNT(*) FROM "ClientSupportTicket"), 1),
  (SELECT COUNT(*) FROM "ClientSupportTicket") > 0
);

CREATE TABLE "ClientTicketInternalNote" (
  "id" TEXT NOT NULL,
  "ticketId" TEXT NOT NULL,
  "authorAdminId" TEXT NOT NULL DEFAULT '',
  "authorName" TEXT NOT NULL DEFAULT 'Admin',
  "note" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ClientTicketInternalNote_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ClientTicketInternalNote_ticketId_fkey"
    FOREIGN KEY ("ticketId") REFERENCES "ClientSupportTicket"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "ClientTicketInternalNote_ticketId_createdAt_idx"
  ON "ClientTicketInternalNote"("ticketId", "createdAt");

CREATE INDEX "ClientSupportTicket_priority_status_updatedAt_idx"
  ON "ClientSupportTicket"("priority", "status", "updatedAt");

CREATE INDEX "ClientSupportTicket_assignedTo_status_idx"
  ON "ClientSupportTicket"("assignedTo", "status");

CREATE INDEX "ClientSupportTicket_firstResponseDueAt_idx"
  ON "ClientSupportTicket"("firstResponseDueAt");

CREATE INDEX "ClientSupportTicket_resolutionDueAt_idx"
  ON "ClientSupportTicket"("resolutionDueAt");

CREATE INDEX "ClientSupportTicket_lastActivityAt_idx"
  ON "ClientSupportTicket"("lastActivityAt");
