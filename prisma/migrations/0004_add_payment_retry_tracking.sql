-- Add payment retry tracking fields to PlatformOrgBilling
ALTER TABLE "PlatformOrgBilling" ADD COLUMN IF NOT EXISTS "firstPaymentFailureDate" TIMESTAMP(3);
ALTER TABLE "PlatformOrgBilling" ADD COLUMN IF NOT EXISTS "paymentRetryCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "PlatformOrgBilling" ADD COLUMN IF NOT EXISTS "lastPaymentRetryDate" TIMESTAMP(3);
ALTER TABLE "PlatformOrgBilling" ADD COLUMN IF NOT EXISTS "warningEmailSent" BOOLEAN NOT NULL DEFAULT false;

