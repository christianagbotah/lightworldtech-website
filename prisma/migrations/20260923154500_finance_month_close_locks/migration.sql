CREATE TABLE "FinanceMonthClose" (
  "id" TEXT NOT NULL,
  "monthStart" TIMESTAMP(3) NOT NULL,
  "monthEnd" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'open',
  "closedAt" TIMESTAMP(3),
  "closedBy" TEXT NOT NULL DEFAULT '',
  "reopenedAt" TIMESTAMP(3),
  "reopenedBy" TEXT NOT NULL DEFAULT '',
  "notes" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "FinanceMonthClose_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FinanceMonthClose_valid_dates" CHECK ("monthEnd" >= "monthStart"),
  CONSTRAINT "FinanceMonthClose_valid_status" CHECK ("status" IN ('open', 'closed'))
);

CREATE UNIQUE INDEX "FinanceMonthClose_monthStart_key"
  ON "FinanceMonthClose"("monthStart");

CREATE INDEX "FinanceMonthClose_status_monthStart_idx"
  ON "FinanceMonthClose"("status", "monthStart");
