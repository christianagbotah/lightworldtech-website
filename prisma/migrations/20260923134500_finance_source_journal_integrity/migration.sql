-- Enforce one automatic journal per operational source event without
-- restricting manual journals, which intentionally use an empty sourceId.
CREATE UNIQUE INDEX IF NOT EXISTS "FinanceJournalEntry_source_event_unique"
  ON "FinanceJournalEntry"("sourceType", "sourceId")
  WHERE "sourceId" <> '';

-- Ensure the current financial year is immediately usable on first rollout.
-- This insert is skipped when any existing period already overlaps FY 2026.
INSERT INTO "FinanceAccountingPeriod"
  ("id", "name", "startDate", "endDate", "status", "closedBy", "createdAt", "updatedAt")
SELECT
  'period_fy_2026',
  'FY 2026',
  TIMESTAMP '2026-01-01 00:00:00',
  TIMESTAMP '2026-12-31 23:59:59.999',
  'open',
  '',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1
  FROM "FinanceAccountingPeriod"
  WHERE "startDate" <= TIMESTAMP '2026-12-31 23:59:59.999'
    AND "endDate" >= TIMESTAMP '2026-01-01 00:00:00'
);
