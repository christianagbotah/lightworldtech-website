CREATE TABLE "ContactMessageReply" (
  "id" TEXT NOT NULL,
  "contactMessageId" TEXT NOT NULL,
  "authorAdminId" TEXT NOT NULL DEFAULT '',
  "authorName" TEXT NOT NULL DEFAULT '',
  "authorEmail" TEXT NOT NULL DEFAULT '',
  "recipient" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'sent',
  "transport" TEXT NOT NULL DEFAULT '',
  "error" TEXT NOT NULL DEFAULT '',
  "sentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ContactMessageReply_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ContactMessageReply_contactMessageId_fkey"
    FOREIGN KEY ("contactMessageId") REFERENCES "ContactMessage"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "ContactMessageReply_contactMessageId_createdAt_idx"
ON "ContactMessageReply"("contactMessageId", "createdAt");

CREATE INDEX "ContactMessageReply_status_createdAt_idx"
ON "ContactMessageReply"("status", "createdAt");
