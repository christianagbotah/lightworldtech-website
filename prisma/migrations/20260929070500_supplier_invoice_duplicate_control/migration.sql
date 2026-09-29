ALTER TABLE "FinanceVendorBill"
ADD COLUMN "vendorReferenceNormalized" TEXT;

WITH normalized AS (
  SELECT
    "id",
    "vendorId",
    NULLIF(
      UPPER(REGEXP_REPLACE(BTRIM("vendorReference"), '[^A-Za-z0-9]+', '', 'g')),
      ''
    ) AS normalized_reference,
    ROW_NUMBER() OVER (
      PARTITION BY
        "vendorId",
        NULLIF(
          UPPER(REGEXP_REPLACE(BTRIM("vendorReference"), '[^A-Za-z0-9]+', '', 'g')),
          ''
        )
      ORDER BY "createdAt", "id"
    ) AS duplicate_rank
  FROM "FinanceVendorBill"
  WHERE "status" <> 'rejected'
    AND BTRIM("vendorReference") <> ''
)
UPDATE "FinanceVendorBill" AS bill
SET "vendorReferenceNormalized" = normalized.normalized_reference
FROM normalized
WHERE bill."id" = normalized."id"
  AND normalized.normalized_reference IS NOT NULL
  AND normalized.duplicate_rank = 1;

CREATE INDEX "FinanceVendorBill_vendorId_vendorReferenceNormalized_idx"
ON "FinanceVendorBill"("vendorId", "vendorReferenceNormalized");

CREATE UNIQUE INDEX "FinanceVendorBill_vendor_reference_active_key"
ON "FinanceVendorBill"("vendorId", "vendorReferenceNormalized")
WHERE "vendorReferenceNormalized" IS NOT NULL
  AND "status" <> 'rejected';
