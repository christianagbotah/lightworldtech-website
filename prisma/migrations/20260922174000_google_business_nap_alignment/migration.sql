-- Phase 64: align the visible company phone with the current Google Business profile.
-- Update only known legacy representations so later CMS edits remain authoritative.

UPDATE "SiteSetting"
SET "value" = '0243618186', "updatedAt" = CURRENT_TIMESTAMP
WHERE "key" = 'company_phone1'
  AND REPLACE(REPLACE(REPLACE(REPLACE(REPLACE("value", ' ', ''), '(', ''), ')', ''), '-', ''), '+', '')
      IN ('2330243618186', '0243618186', '233243618186');
