-- Add deactivatedAt and deactivatedReason columns
ALTER TABLE "Org" ADD COLUMN IF NOT EXISTS "deactivatedAt" TIMESTAMP(3);
ALTER TABLE "Org" ADD COLUMN IF NOT EXISTS "deactivatedReason" TEXT;

-- Ensure pausedAt and pausedReason exist
ALTER TABLE "Org" ADD COLUMN IF NOT EXISTS "pausedAt" TIMESTAMP(3);
ALTER TABLE "Org" ADD COLUMN IF NOT EXISTS "pausedReason" TEXT;

-- Migrate data from suspendedAt/suspendedReason to deactivatedAt/deactivatedReason if they exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Org' AND column_name = 'suspendedAt') THEN
    UPDATE "Org" 
    SET "deactivatedAt" = "suspendedAt", 
        "deactivatedReason" = "suspendedReason"
    WHERE "suspendedAt" IS NOT NULL 
      AND "deactivatedAt" IS NULL;
  END IF;
END $$;

