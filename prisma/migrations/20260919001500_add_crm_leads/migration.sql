-- Phase 4: additive CRM pipeline for website enquiries.

CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "contactMessageId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'new',
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "assignedTo" TEXT NOT NULL DEFAULT '',
    "source" TEXT NOT NULL DEFAULT 'website',
    "summary" TEXT NOT NULL DEFAULT '',
    "tags" TEXT NOT NULL DEFAULT '[]',
    "nextFollowUp" TIMESTAMP(3),
    "lastContactedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LeadNote" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "author" TEXT NOT NULL DEFAULT 'Admin',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadNote_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Lead_contactMessageId_key" ON "Lead"("contactMessageId");
CREATE INDEX "Lead_status_updatedAt_idx" ON "Lead"("status", "updatedAt");
CREATE INDEX "Lead_priority_updatedAt_idx" ON "Lead"("priority", "updatedAt");
CREATE INDEX "Lead_nextFollowUp_idx" ON "Lead"("nextFollowUp");
CREATE INDEX "LeadNote_leadId_createdAt_idx" ON "LeadNote"("leadId", "createdAt");

ALTER TABLE "Lead"
ADD CONSTRAINT "Lead_contactMessageId_fkey"
FOREIGN KEY ("contactMessageId") REFERENCES "ContactMessage"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LeadNote"
ADD CONSTRAINT "LeadNote_leadId_fkey"
FOREIGN KEY ("leadId") REFERENCES "Lead"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
