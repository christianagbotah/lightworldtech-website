ALTER TABLE "ClientPayment"
  ADD COLUMN "source" TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN "providerReference" TEXT NOT NULL DEFAULT '';

CREATE TABLE "HubtelPaymentIntent" (
  "id" TEXT NOT NULL,
  "clientReference" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "invoiceId" TEXT NOT NULL,
  "recordedPaymentId" TEXT,
  "currency" TEXT NOT NULL DEFAULT 'GHS',
  "amount" DECIMAL(18,2) NOT NULL,
  "payerName" TEXT NOT NULL DEFAULT '',
  "payerEmail" TEXT NOT NULL DEFAULT '',
  "payerPhone" TEXT NOT NULL DEFAULT '',
  "status" TEXT NOT NULL DEFAULT 'pending',
  "checkoutId" TEXT NOT NULL DEFAULT '',
  "checkoutUrl" TEXT NOT NULL DEFAULT '',
  "checkoutDirectUrl" TEXT NOT NULL DEFAULT '',
  "hubtelTransactionId" TEXT NOT NULL DEFAULT '',
  "externalTransactionId" TEXT NOT NULL DEFAULT '',
  "paymentMethod" TEXT NOT NULL DEFAULT '',
  "providerResponse" TEXT NOT NULL DEFAULT '{}',
  "lastStatusCheckAt" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "HubtelPaymentIntent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "HubtelPaymentIntent_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "ClientOrganization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "HubtelPaymentIntent_invoiceId_fkey"
    FOREIGN KEY ("invoiceId") REFERENCES "ClientInvoice"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "HubtelPaymentIntent_recordedPaymentId_fkey"
    FOREIGN KEY ("recordedPaymentId") REFERENCES "ClientPayment"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "HubtelPaymentIntent_clientReference_key" ON "HubtelPaymentIntent"("clientReference");
CREATE UNIQUE INDEX "HubtelPaymentIntent_recordedPaymentId_key" ON "HubtelPaymentIntent"("recordedPaymentId");
CREATE INDEX "HubtelPaymentIntent_organizationId_status_idx" ON "HubtelPaymentIntent"("organizationId","status");
CREATE INDEX "HubtelPaymentIntent_invoiceId_status_idx" ON "HubtelPaymentIntent"("invoiceId","status");
CREATE INDEX "HubtelPaymentIntent_status_createdAt_idx" ON "HubtelPaymentIntent"("status","createdAt");
CREATE INDEX "HubtelPaymentIntent_hubtelTransactionId_idx" ON "HubtelPaymentIntent"("hubtelTransactionId");

CREATE TABLE "SmsTemplate" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "category" TEXT NOT NULL DEFAULT 'general',
  "body" TEXT NOT NULL,
  "variables" TEXT NOT NULL DEFAULT '[]',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "system" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SmsTemplate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SmsTemplate_key_key" ON "SmsTemplate"("key");
CREATE INDEX "SmsTemplate_active_category_idx" ON "SmsTemplate"("active","category");
CREATE INDEX "SmsTemplate_name_idx" ON "SmsTemplate"("name");

CREATE TABLE "SmsCampaign" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "templateId" TEXT,
  "senderId" TEXT NOT NULL DEFAULT '',
  "body" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "audienceType" TEXT NOT NULL DEFAULT 'manual',
  "scheduledAt" TIMESTAMP(3),
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "recipientCount" INTEGER NOT NULL DEFAULT 0,
  "sentCount" INTEGER NOT NULL DEFAULT 0,
  "failedCount" INTEGER NOT NULL DEFAULT 0,
  "createdBy" TEXT NOT NULL DEFAULT 'Admin',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SmsCampaign_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SmsCampaign_templateId_fkey"
    FOREIGN KEY ("templateId") REFERENCES "SmsTemplate"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "SmsCampaign_status_scheduledAt_idx" ON "SmsCampaign"("status","scheduledAt");
CREATE INDEX "SmsCampaign_templateId_idx" ON "SmsCampaign"("templateId");
CREATE INDEX "SmsCampaign_createdAt_idx" ON "SmsCampaign"("createdAt");

CREATE TABLE "SmsCampaignRecipient" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "name" TEXT NOT NULL DEFAULT '',
  "variables" TEXT NOT NULL DEFAULT '{}',
  "status" TEXT NOT NULL DEFAULT 'pending',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "error" TEXT NOT NULL DEFAULT '',
  "sentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SmsCampaignRecipient_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SmsCampaignRecipient_campaignId_fkey"
    FOREIGN KEY ("campaignId") REFERENCES "SmsCampaign"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "SmsCampaignRecipient_campaignId_phone_key" ON "SmsCampaignRecipient"("campaignId","phone");
CREATE INDEX "SmsCampaignRecipient_campaignId_status_idx" ON "SmsCampaignRecipient"("campaignId","status");

CREATE TABLE "SmsMessage" (
  "id" TEXT NOT NULL,
  "templateId" TEXT,
  "campaignId" TEXT,
  "recipient" TEXT NOT NULL,
  "senderId" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "clientReference" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'queued',
  "providerMessageId" TEXT NOT NULL DEFAULT '',
  "networkId" TEXT NOT NULL DEFAULT '',
  "rate" DECIMAL(18,4),
  "error" TEXT NOT NULL DEFAULT '',
  "scheduledAt" TIMESTAMP(3),
  "sentAt" TIMESTAMP(3),
  "deliveredAt" TIMESTAMP(3),
  "createdBy" TEXT NOT NULL DEFAULT 'Admin',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SmsMessage_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SmsMessage_templateId_fkey"
    FOREIGN KEY ("templateId") REFERENCES "SmsTemplate"("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "SmsMessage_campaignId_fkey"
    FOREIGN KEY ("campaignId") REFERENCES "SmsCampaign"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "SmsMessage_clientReference_key" ON "SmsMessage"("clientReference");
CREATE INDEX "SmsMessage_campaignId_status_idx" ON "SmsMessage"("campaignId","status");
CREATE INDEX "SmsMessage_recipient_createdAt_idx" ON "SmsMessage"("recipient","createdAt");
CREATE INDEX "SmsMessage_status_scheduledAt_idx" ON "SmsMessage"("status","scheduledAt");
CREATE INDEX "SmsMessage_providerMessageId_idx" ON "SmsMessage"("providerMessageId");

INSERT INTO "SmsTemplate"
  ("id","name","key","category","body","variables","active","system","createdAt","updatedAt")
VALUES
  ('sms-tpl-payment-due','Payment due reminder','payment_due','billing',
   'Dear {{name}}, invoice {{invoice}} for {{amount}} is due {{dueDate}}. Pay securely: {{paymentLink}}. Lightworld Technologies.',
   '["name","invoice","amount","dueDate","paymentLink"]',true,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
  ('sms-tpl-payment-received','Payment received','payment_received','billing',
   'Dear {{name}}, we received {{amount}} for invoice {{invoice}}. Receipt: {{receipt}}. Thank you - Lightworld Technologies.',
   '["name","amount","invoice","receipt"]',true,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
  ('sms-tpl-service-renewal','Service renewal reminder','service_renewal','service',
   'Dear {{name}}, your {{service}} service expires {{expiryDate}}. Renewal amount: {{amount}}. Contact Lightworld Technologies.',
   '["name","service","expiryDate","amount"]',true,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
  ('sms-tpl-service-expired','Service expired notice','service_expired','service',
   'Dear {{name}}, your {{service}} service expired {{expiryDate}}. Please renew to avoid service interruption. Lightworld Technologies.',
   '["name","service","expiryDate"]',true,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
  ('sms-tpl-support-update','Support ticket update','support_update','support',
   'Dear {{name}}, ticket {{ticket}} has been updated: {{status}}. Sign in to the Lightworld client portal for details.',
   '["name","ticket","status"]',true,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
  ('sms-tpl-general','General customer message','general_customer','general',
   'Dear {{name}}, {{message}} - Lightworld Technologies.',
   '["name","message"]',true,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;
