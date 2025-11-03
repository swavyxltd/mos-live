-- Safe migration script for Event model
-- This can be run manually or via Prisma Studio

-- CreateTable
CREATE TABLE IF NOT EXISTS "Event" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "location" TEXT,
    "teacher" TEXT,
    "description" TEXT,
    "classId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (optional, for better query performance)
CREATE INDEX IF NOT EXISTS "Event_orgId_idx" ON "Event"("orgId");
CREATE INDEX IF NOT EXISTS "Event_classId_idx" ON "Event"("classId");
CREATE INDEX IF NOT EXISTS "Event_date_idx" ON "Event"("date");

-- AddForeignKey (only if constraint doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'Event_orgId_fkey'
    ) THEN
        ALTER TABLE "Event" ADD CONSTRAINT "Event_orgId_fkey" 
        FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'Event_classId_fkey'
    ) THEN
        ALTER TABLE "Event" ADD CONSTRAINT "Event_classId_fkey" 
        FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

