ALTER TABLE "FinanceOutflowApproval"
  DROP CONSTRAINT IF EXISTS "FinanceOutflowApproval_valid_status";

ALTER TABLE "FinanceOutflowApproval"
  ADD CONSTRAINT "FinanceOutflowApproval_valid_status"
  CHECK ("status" IN ('pending','scheduled','approved','rejected','cancelled'));