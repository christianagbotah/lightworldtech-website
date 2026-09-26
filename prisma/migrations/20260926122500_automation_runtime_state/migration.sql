CREATE TABLE "AutomationRuntimeState" (
  "id" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'unknown',
  "lastStartedAt" TIMESTAMP(3),
  "lastCompletedAt" TIMESTAMP(3),
  "lastSuccessAt" TIMESTAMP(3),
  "durationMs" INTEGER NOT NULL DEFAULT 0,
  "consecutiveFailures" INTEGER NOT NULL DEFAULT 0,
  "lastError" TEXT NOT NULL DEFAULT '',
  "resultJson" TEXT NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AutomationRuntimeState_pkey" PRIMARY KEY ("id")
);
