-- Phase 3 first-party analytics schema upgrade.
-- Idempotent by design so deployment can safely verify/apply it before traffic switches.

CREATE TABLE IF NOT EXISTS "AnalyticsEvent" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "sessionId" TEXT NOT NULL,
  "event" TEXT NOT NULL,
  "path" TEXT NOT NULL DEFAULT '/',
  "referrer" TEXT NOT NULL DEFAULT '',
  "metadata" TEXT NOT NULL DEFAULT '{}',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "AnalyticsEvent_createdAt_idx"
  ON "AnalyticsEvent"("createdAt");

CREATE INDEX IF NOT EXISTS "AnalyticsEvent_event_createdAt_idx"
  ON "AnalyticsEvent"("event", "createdAt");

CREATE INDEX IF NOT EXISTS "AnalyticsEvent_sessionId_createdAt_idx"
  ON "AnalyticsEvent"("sessionId", "createdAt");

CREATE INDEX IF NOT EXISTS "AnalyticsEvent_path_createdAt_idx"
  ON "AnalyticsEvent"("path", "createdAt");
