-- SQL to create all test account types
-- Run this in your database SQL editor (Neon, Vercel Postgres, etc.)

-- Create/get test organization
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
ON CONFLICT ("slug") DO NOTHING;

-- Create owner user (can access owner portal)
INSERT INTO "User" ("id", "email", "name", "phone", "isSuperAdmin", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid()::text,
  'owner@test.com',
  'Owner User',
  '+44 7700 900099',
  true,
  NOW(),
  NOW()
)
ON CONFLICT ("email") DO UPDATE SET 
  "isSuperAdmin" = true,
  "updatedAt" = NOW();

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

-- Link admin to org
INSERT INTO "UserOrgMembership" ("id", "userId", "orgId", "role")
SELECT 
  gen_random_uuid()::text,
  u.id,
  o.id,
  'ADMIN'
FROM "User" u, "Org" o
WHERE u.email = 'admin@test.com' AND o.slug = 'test-islamic-school'
ON CONFLICT DO NOTHING;

-- Link staff to org
INSERT INTO "UserOrgMembership" ("id", "userId", "orgId", "role")
SELECT 
  gen_random_uuid()::text,
  u.id,
  o.id,
  'STAFF'
FROM "User" u, "Org" o
WHERE u.email = 'staff@test.com' AND o.slug = 'test-islamic-school'
ON CONFLICT DO NOTHING;

-- Link parent to org
INSERT INTO "UserOrgMembership" ("id", "userId", "orgId", "role")
SELECT 
  gen_random_uuid()::text,
  u.id,
  o.id,
  'PARENT'
FROM "User" u, "Org" o
WHERE u.email = 'parent@test.com' AND o.slug = 'test-islamic-school'
ON CONFLICT DO NOTHING;

-- Verify all accounts were created
SELECT 
  u.email,
  u.name,
  u."isSuperAdmin" as "isOwner",
  o.name as organization,
  m.role
FROM "User" u
LEFT JOIN "UserOrgMembership" m ON u.id = m."userId"
LEFT JOIN "Org" o ON m."orgId" = o.id
WHERE u.email IN ('owner@test.com', 'admin@test.com', 'staff@test.com', 'parent@test.com')
ORDER BY u.email;
