-- Phase 51: consolidate Lightworld Technologies search/entity identity.
-- Updates only known legacy/blank values so later CMS edits remain authoritative.

UPDATE "SiteSetting"
SET "value" = 'https://lightworldtech.com', "updatedAt" = CURRENT_TIMESTAMP
WHERE "key" = 'seo_site_url' AND BTRIM("value") = '';

UPDATE "SiteSetting"
SET "value" = 'Lightworld Technologies', "updatedAt" = CURRENT_TIMESTAMP
WHERE "key" = 'seo_site_name' AND (BTRIM("value") = '' OR LOWER(BTRIM("value")) = 'lightworldtech');

UPDATE "SiteSetting"
SET "value" = 'Lightworld Technologies Limited | Software Company in Ghana', "updatedAt" = CURRENT_TIMESTAMP
WHERE "key" = 'seo_title'
  AND (
    BTRIM("value") = ''
    OR "value" = 'Lightworld Technologies Ltd – The World of Possibilities'
    OR "value" = 'Lightworld Technologies Ltd - The World of Possibilities'
  );

UPDATE "SiteSetting"
SET "value" = 'Lightworld Technologies Limited is a Ghanaian software and IT company in Tema, Greater Accra, building websites, mobile apps, enterprise software, AI automation and cloud solutions, with IT training and technology consulting.', "updatedAt" = CURRENT_TIMESTAMP
WHERE "key" = 'seo_description'
  AND (
    BTRIM("value") = ''
    OR "value" = 'We develop and design websites, Mobile Apps, School Management Software and other CRMs, Computer Science Training, Beads and Crafts Design Training, etc'
  );

UPDATE "SiteSetting"
SET "value" = 'Lightworld Technologies Limited, Lightworld Technologies Ghana, software company Ghana, software development Ghana, web development Ghana, website development Ghana, mobile app development Ghana, enterprise software Ghana, AI automation Ghana, IT company Tema, IT company Ghana, IT consulting Ghana, IT training Ghana, cloud solutions Ghana', "updatedAt" = CURRENT_TIMESTAMP
WHERE "key" = 'seo_keywords'
  AND (
    BTRIM("value") = ''
    OR "value" = 'web development, mobile app development, IT training, SEO, digital marketing, Ghana, Lightworld Technologies'
  );

UPDATE "SiteSetting"
SET "value" = 'Tema', "updatedAt" = CURRENT_TIMESTAMP
WHERE "key" = 'seo_address_city'
  AND (BTRIM("value") = '' OR LOWER(BTRIM("value")) = 'accra');

UPDATE "SiteSetting"
SET "value" = 'Greater Accra', "updatedAt" = CURRENT_TIMESTAMP
WHERE "key" = 'seo_address_region'
  AND (BTRIM("value") = '' OR LOWER(BTRIM("value")) = 'ghana');

UPDATE "SiteSetting"
SET "value" = 'en_GH', "updatedAt" = CURRENT_TIMESTAMP
WHERE "key" = 'seo_locale' AND BTRIM("value") = '';

UPDATE "SiteSetting"
SET "value" = 'Lightworld Technologies Limited is a Ghanaian software and IT company based in Tema, Greater Accra, building websites, mobile apps, enterprise systems, AI-enabled workflows and cloud solutions for businesses and institutions in Ghana and beyond.', "updatedAt" = CURRENT_TIMESTAMP
WHERE "key" = 'company_description'
  AND "value" = 'We are a leading IT solutions company providing cutting-edge software development, web development, mobile app development, and digital marketing services to businesses across Africa and beyond.';

UPDATE "SiteSetting"
SET "value" = '+233 (055) 538 4113', "updatedAt" = CURRENT_TIMESTAMP
WHERE "key" = 'company_phone2'
  AND (
    BTRIM("value") = ''
    OR "value" = '+233 (055) 467 2081'
    OR "value" = '+233 55 467 2081'
  );

UPDATE "TeamMember"
SET "name" = 'Robert Yaw Essuon', "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = 'leadership-rober-yaw-essuon' AND "name" = 'Rober Yaw Essuon';
