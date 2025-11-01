-- Update owner account with password
-- Run this in Supabase SQL Editor

-- First, add password column if it doesn't exist
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "password" TEXT;

-- Update owner account with hashed password
-- Password: Trentlfc66!
UPDATE "User" 
SET "password" = '$2a$12$jK4kmKD7HshVFCI1q7Z3gu6iGLxKxBWZaceh06SJqrtt.i7zAN5Vm'
WHERE "email" = 'swavyxltd@gmail.com';

-- Verify the update
SELECT "email", "name", "isSuperAdmin", "password" IS NOT NULL as "hasPassword"
FROM "User" 
WHERE "email" = 'swavyxltd@gmail.com';

