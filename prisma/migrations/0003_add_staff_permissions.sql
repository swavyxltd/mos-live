-- Add staffSubrole and isInitialAdmin to UserOrgMembership
ALTER TABLE "UserOrgMembership" 
ADD COLUMN IF NOT EXISTS "staffSubrole" TEXT,
ADD COLUMN IF NOT EXISTS "isInitialAdmin" BOOLEAN NOT NULL DEFAULT false;

-- Create StaffPermission table
CREATE TABLE IF NOT EXISTS "StaffPermission" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffPermission_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint on key
CREATE UNIQUE INDEX IF NOT EXISTS "StaffPermission_key_key" ON "StaffPermission"("key");

-- Create StaffPermissionAssignment table
CREATE TABLE IF NOT EXISTS "StaffPermissionAssignment" (
    "id" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffPermissionAssignment_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint on membershipId and permissionId
CREATE UNIQUE INDEX IF NOT EXISTS "StaffPermissionAssignment_membershipId_permissionId_key" 
ON "StaffPermissionAssignment"("membershipId", "permissionId");

-- Create index on membershipId for faster queries
CREATE INDEX IF NOT EXISTS "StaffPermissionAssignment_membershipId_idx" 
ON "StaffPermissionAssignment"("membershipId");

-- Add foreign key constraints
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'StaffPermissionAssignment_membershipId_fkey'
    ) THEN
        ALTER TABLE "StaffPermissionAssignment" 
        ADD CONSTRAINT "StaffPermissionAssignment_membershipId_fkey" 
        FOREIGN KEY ("membershipId") REFERENCES "UserOrgMembership"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'StaffPermissionAssignment_permissionId_fkey'
    ) THEN
        ALTER TABLE "StaffPermissionAssignment" 
        ADD CONSTRAINT "StaffPermissionAssignment_permissionId_fkey" 
        FOREIGN KEY ("permissionId") REFERENCES "StaffPermission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Insert default permissions
INSERT INTO "StaffPermission" ("id", "key", "name", "description", "category", "createdAt", "updatedAt")
VALUES 
    ('sp-access_dashboard-1', 'access_dashboard', 'Dashboard', 'Access to the main dashboard', 'pages', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('sp-access_classes-1', 'access_classes', 'Classes', 'View and manage classes', 'pages', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('sp-access_students-1', 'access_students', 'Students', 'View and manage students', 'pages', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('sp-access_applications-1', 'access_applications', 'Applications', 'View and process student applications', 'pages', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('sp-access_staff-1', 'access_staff', 'Staff Management', 'View and manage staff members', 'pages', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('sp-access_attendance-1', 'access_attendance', 'Attendance', 'Mark and view attendance records', 'pages', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('sp-access_finances-1', 'access_finances', 'Finances', 'View financial overview and reports', 'pages', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('sp-access_fees-1', 'access_fees', 'Fees', 'Manage fee plans and structures', 'pages', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('sp-access_payments-1', 'access_payments', 'Payments', 'View and manage payment records', 'pages', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('sp-access_messages-1', 'access_messages', 'Messages', 'Send and manage messages', 'pages', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('sp-access_calendar-1', 'access_calendar', 'Calendar', 'View and create calendar events', 'pages', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('sp-access_support-1', 'access_support', 'Support', 'Access support tickets', 'pages', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('sp-access_settings-1', 'access_settings', 'Settings', 'Access organisation settings', 'pages', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO UPDATE SET
    "name" = EXCLUDED."name",
    "description" = EXCLUDED."description",
    "category" = EXCLUDED."category",
    "updatedAt" = CURRENT_TIMESTAMP;

