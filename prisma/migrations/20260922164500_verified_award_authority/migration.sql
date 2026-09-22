-- Phase 61: seed exact publisher-backed award titles when the CMS has no recognition record.
-- Existing human-edited recognition content remains authoritative.

INSERT INTO "SiteSetting" ("id", "key", "value", "type", "group", "createdAt", "updatedAt")
SELECT
  'phase61-verified-awards',
  'about_recognition',
  '[{"year":"2026","publisher":"MEA Markets","title":"Web Development Agency of the Year 2026 - Accra","description":"MEA Markets named Lightworld Technologies Limited Web Development Agency of the Year 2026 - Accra in the African Excellence Awards.","href":"https://meamarkets.digital/winners/lightworld-technologies-limited-2/"},{"year":"2024","publisher":"Acquisition International","title":"Best Full-Service Web & App Design Company 2024 - Accra","description":"Acquisition International named Lightworld Technologies Limited Best Full-Service Web & App Design Company 2024 - Accra in the Business Excellence Awards.","href":"https://www.acquisition-international.com/winners/lightworld-technologies-limited/"},{"year":"2021","publisher":"MEA Markets","title":"Best SEO & Social Media Marketing Agency - Ghana","description":"MEA Markets named Lightworld Technologies Limited Best SEO & Social Media Marketing Agency - Ghana in the 2021 MEA Business Awards.","href":"https://meamarkets.digital/winners/lightworld-technologies-limited/"}]',
  'json',
  'about',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1 FROM "SiteSetting" WHERE "key" = 'about_recognition'
);
