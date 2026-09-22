-- Phase 56: strengthen visible homepage entity relevance without overwriting CMS edits.
-- Only create the fields when they do not already exist.

INSERT INTO "SiteSetting" ("id", "key", "value", "type", "group", "createdAt", "updatedAt")
SELECT 'phase56-home-eyebrow', 'home_eyebrow', 'Lightworld Technologies Limited · Tema, Ghana', 'text', 'home', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "SiteSetting" WHERE "key" = 'home_eyebrow');

INSERT INTO "SiteSetting" ("id", "key", "value", "type", "group", "createdAt", "updatedAt")
SELECT 'phase56-home-title', 'home_title', 'Software, AI and digital systems built for real business.', 'text', 'home', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "SiteSetting" WHERE "key" = 'home_title');

INSERT INTO "SiteSetting" ("id", "key", "value", "type", "group", "createdAt", "updatedAt")
SELECT 'phase56-home-description', 'home_description', 'A Ghanaian software company and IT training institute designing websites, mobile apps, enterprise software, AI automation and cloud systems, with practical technology consulting and training.', 'text', 'home', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "SiteSetting" WHERE "key" = 'home_description');

INSERT INTO "SiteSetting" ("id", "key", "value", "type", "group", "createdAt", "updatedAt")
SELECT 'phase56-home-entity-summary', 'home_entity_summary', 'Based in Tema, Greater Accra, Lightworld Technologies Limited serves businesses and institutions across Ghana and beyond.', 'text', 'home', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "SiteSetting" WHERE "key" = 'home_entity_summary');
