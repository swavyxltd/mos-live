-- Remove default values from billingDay and feeDueDay columns
-- This allows organizations to have null/empty billing days by default

ALTER TABLE "Org" ALTER COLUMN "billingDay" DROP DEFAULT;
ALTER TABLE "Org" ALTER COLUMN "feeDueDay" DROP DEFAULT;

