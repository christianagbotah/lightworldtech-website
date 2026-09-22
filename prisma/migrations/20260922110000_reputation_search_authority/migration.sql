-- Phase 57: add a neutral Google review request template for genuine clients.
-- The template is optional, contains no incentive, and is never gated by rating.

INSERT INTO "SmsTemplate"
  ("id","name","key","category","body","variables","active","system","createdAt","updatedAt")
VALUES
  ('sms-tpl-google-review-request','Google review request','google_review_request','reputation',
   'Dear {{name}}, thank you for choosing Lightworld Technologies. Share an honest Google review: https://lightworldtech.com/review. Reviews are optional.',
   '["name"]',true,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;
