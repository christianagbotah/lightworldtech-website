ALTER TABLE "ClientAgreement"
ADD COLUMN "contractValueBasis" TEXT NOT NULL DEFAULT 'unspecified';

ALTER TABLE "ClientAgreement"
ADD CONSTRAINT "ClientAgreement_contractValueBasis_check"
CHECK ("contractValueBasis" IN ('unspecified', 'tax_exclusive', 'tax_inclusive'));
