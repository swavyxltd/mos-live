-- Create test accounts for admin, staff, and parent
-- Run this in your database SQL editor (Neon, Vercel Postgres, etc.)

-- First, create a test organization
INSERT INTO "Org" ("id", "name", "slug", "timezone", "settings", "createdAt", "updatedAt", "status")
VALUES (
  gen_random_uuid()::text,
  'Test Islamic School',
  'test-islamic-school',
  'Europe/London',
  '{"lateThreshold": 15, "remindersEnabled": true, "hijriCalendar": false}',
  NOW(),
  NOW(),
  'ACTIVE'
)
ON CONFLICT ("slug") DO UPDATE SET "updatedAt" = NOW()
RETURNING "id";

-- Get the org ID (you'll need to replace this with the actual ID after creating the org)
-- For now, let's create a reusable version that finds or creates the org

-- Create test organization (if it doesn't exist)
WITH test_org AS (
  INSERT INTO "Org" ("id", "name", "slug", "timezone", "settings", "createdAt", "updatedAt", "status")
  VALUES (
    gen_random_uuid()::text,
    'Test Islamic School',
    'test-islamic-school',
    'Europe/London',
    '{"lateThreshold": 15, "remindersEnabled": true, "hijriCalendar": false}',
    NOW(),
    NOW(),
    'ACTIVE'
  )
  ON CONFLICT ("slug") DO UPDATE SET "updatedAt" = NOW()
  RETURNING "id"
),
-- Create admin user
admin_user AS (
  INSERT INTO "User" ("id", "email", "name", "phone", "isSuperAdmin", "createdAt", "updatedAt")
  VALUES (
    gen_random_uuid()::text,
    'admin@test.com',
    'Admin User',
    '+44 7700 900100',
    false,
    NOW(),
    NOW()
  )
  ON CONFLICT ("email") DO UPDATE SET "updatedAt" = NOW()
  RETURNING "id"
),
-- Create staff user
staff_user AS (
  INSERT INTO "User" ("id", "email", "name", "phone", "isSuperAdmin", "createdAt", "updatedAt")
  VALUES (
    gen_random_uuid()::text,
    'staff@test.com',
    'Staff User',
    '+44 7700 900101',
    false,
    NOW(),
    NOW()
  )
  ON CONFLICT ("email") DO UPDATE SET "updatedAt" = NOW()
  RETURNING "id"
),
-- Create parent user
parent_user AS (
  INSERT INTO "User" ("id", "email", "name", "phone", "isSuperAdmin", "createdAt", "updatedAt")
  VALUES (
    gen_random_uuid()::text,
    'parent@test.com',
    'Parent User',
    '+44 7700 900102',
    false,
    NOW(),
    NOW()
  )
  ON CONFLICT ("email") DO UPDATE SET "updatedAt" = NOW()
  RETURNING "id"
)
-- Create memberships
INSERT INTO "UserOrgMembership" ("id", "userId", "orgId", "role")
SELECT 
  gen_random_uuid()::text,
  admin_user.id,
  test_org.id,
  'ADMIN'
FROM test_org, admin_user
ON CONFLICT DO NOTHING;

INSERT INTO "UserOrgMembership" ("id", "userId", "orgId", "role")
SELECT 
  gen_random_uuid()::text,
  staff_user.id,
  test_org.id,
  'STAFF'
FROM test_org, staff_user
ON CONFLICT DO NOTHING;

INSERT INTO "UserOrgMembership" ("id", "userId", "orgId", "role")
SELECT 
  gen_random_uuid()::text,
  parent_user.id,
  test_org.id,
  'PARENT'
FROM test_org, parent_user
ON CONFLICT DO NOTHING;

-- Alternative simpler version (run these separately):

-- Step 1: Create/get organization
DO $$
DECLARE
  org_id_var TEXT;
BEGIN
  -- Get or create test org
  SELECT "id" INTO org_id_var FROM "Org" WHERE "slug" = 'test-islamic-school';
  
  IF org_id_var IS NULL THEN
    INSERT INTO "Org" ("id", "name", "slug", "timezone", "settings", "createdAt", "updatedAt", "status")
    VALUES (
      gen_random_uuid()::text,
      'Test Islamic School',
      'test-islamic-school',
      'Europe/London',
      '{"lateThreshold": 15}',
      NOW(),
      NOW(),
      'ACTIVE'
    )
    RETURNING "id" INTO org_id_var;
  END IF;
  
  -- Create admin user
  INSERT INTO "User" ("id", "email", "name", "phone", "isSuperAdmin", "createdAt", "updatedAt")
  VALUES (
    gen_random_uuid()::text,
    'admin@test.com',
    'Admin User',
    '+44 7700 900100',
    false,
    NOW(),
    NOW()
  )
  ON CONFLICT ("email") DO NOTHING;
  
  -- Create staff user
  INSERT INTO "User" ("id", "email", "name", "phone", "isSuperAdmin", "createdAt", "updatedAt")
  VALUES (
    gen_random_uuid()::text,
    'staff@test.com',
    'Staff User',
    '+44 7700 900101',
    false,
    NOW(),
    NOW()
  )
  ON CONFLICT ("email") DO NOTHING;
  
  -- Create parent user
  INSERT INTO "User" ("id", "email", "name", "phone", "isSuperAdmin", "createdAt", "updatedAt")
  VALUES (
    gen_random_uuid()::text,
    'parent@test.com',
    'Parent User',
    '+44 7700 900102',
    false,
    NOW(),
    NOW()
  )
  ON CONFLICT ("email") DO NOTHING;
  
  -- Create memberships
  INSERT INTO "UserOrgMembership" ("id", "userId", "orgId", "role")
  SELECT gen_random_uuid()::text, "id", org_id_var, 'ADMIN'
  FROM "User" WHERE "email" = 'admin@test.com'
  ON CONFLICT DO NOTHING;
  
  INSERT INTO "UserOrgMembership" ("id", "userId", "orgId", "role")
  SELECT gen_random_uuid()::text, "id", org_id_var, 'STAFF'
  FROM "User" WHERE "email" = 'staff@test.com'
  ON CONFLICT DO NOTHING;
  
  INSERT INTO "UserOrgMembership" ("id", "userId", "orgId", "role")
  SELECT gen_random_uuid()::text, "id", org_id_var, 'PARENT'
  FROM "User" WHERE "email" = 'parent@test.com'
  ON CONFLICT DO NOTHING;
END $$;

-- Verify the accounts were created
SELECT 
  u.email,
  u.name,
  o.name as organization,
  m.role
FROM "User" u
LEFT JOIN "UserOrgMembership" m ON u.id = m."userId"
LEFT JOIN "Org" o ON m."orgId" = o.id
WHERE u.email IN ('admin@test.com', 'staff@test.com', 'parent@test.com');

