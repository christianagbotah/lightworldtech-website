CREATE TABLE "ClientTicketAttachment" (
  "id" TEXT NOT NULL,
  "ticketId" TEXT NOT NULL,
  "originalName" TEXT NOT NULL,
  "storageName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "uploadedByType" TEXT NOT NULL,
  "uploadedByName" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ClientTicketAttachment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ClientTicketAttachment_ticketId_fkey"
    FOREIGN KEY ("ticketId") REFERENCES "ClientSupportTicket"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ClientTicketAttachment_storageName_key"
  ON "ClientTicketAttachment"("storageName");

CREATE INDEX "ClientTicketAttachment_ticketId_createdAt_idx"
  ON "ClientTicketAttachment"("ticketId", "createdAt");

CREATE TABLE "ClientTicketEvent" (
  "id" TEXT NOT NULL,
  "ticketId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "actorType" TEXT NOT NULL,
  "actorName" TEXT NOT NULL,
  "details" TEXT NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ClientTicketEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ClientTicketEvent_ticketId_fkey"
    FOREIGN KEY ("ticketId") REFERENCES "ClientSupportTicket"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "ClientTicketEvent_ticketId_createdAt_idx"
  ON "ClientTicketEvent"("ticketId", "createdAt");

CREATE INDEX "ClientTicketEvent_type_createdAt_idx"
  ON "ClientTicketEvent"("type", "createdAt");
