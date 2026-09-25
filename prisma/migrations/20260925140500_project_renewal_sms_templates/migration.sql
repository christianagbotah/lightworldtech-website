INSERT INTO "SmsTemplate"
  ("id","name","key","category","body","variables","active","system","createdAt","updatedAt")
VALUES
  ('sms-tpl-project-renewal','Project renewal reminder','project_renewal','project',
   'Dear {{name}}, your {{project}} project renewal is due {{renewalDate}}. Renewal amount: {{amount}}. Contact Lightworld Technologies.',
   '["name","project","renewalDate","amount"]',true,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
  ('sms-tpl-project-expired','Project renewal overdue','project_expired','project',
   'Dear {{name}}, your {{project}} project renewal date was {{renewalDate}}. Renewal amount: {{amount}}. Please contact Lightworld Technologies.',
   '["name","project","renewalDate","amount"]',true,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;
