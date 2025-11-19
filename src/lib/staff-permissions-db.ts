import { prisma } from '@/lib/prisma'
import { StaffPermissionKey, getStaffPermissionKeys, PERMISSION_DEFINITIONS } from '@/types/staff-roles'
import { StaffSubrole } from '@/types/staff-roles'

/**
 * Get all permissions for a staff member in a specific org
 * Returns permission keys from database (base + additional), or falls back to preset if none stored
 */
export async function getStaffPermissionsFromDb(
  userId: string,
  orgId: string
): Promise<StaffPermissionKey[]> {
  // Get the membership
  const membership = await prisma.userOrgMembership.findUnique({
    where: {
      userId_orgId: {
        userId,
        orgId,
      },
    },
    include: {
      Permissions: {
        include: {
          Permission: true,
        },
      },
    },
  })

  if (!membership) {
    return []
  }

  // If user is initial admin or has ADMIN role, return all permissions
  if (membership.isInitialAdmin || membership.role === 'ADMIN') {
    return Object.keys(PERMISSION_DEFINITIONS) as StaffPermissionKey[]
  }

  // If permissions exist in database, use those (base + additional)
  if (membership.Permissions && membership.Permissions.length > 0) {
    return membership.Permissions.map((assignment) => assignment.Permission.key as StaffPermissionKey)
  }

  // Otherwise, fall back to preset based on staffSubrole
  const subrole = (membership.staffSubrole || 'TEACHER') as StaffSubrole
  return getStaffPermissionKeys(subrole)
}

/**
 * Check if a staff member has a specific permission in an org
 */
export async function hasStaffPermissionInOrg(
  userId: string,
  orgId: string,
  permissionKey: StaffPermissionKey
): Promise<boolean> {
  const permissions = await getStaffPermissionsFromDb(userId, orgId)
  return permissions.includes(permissionKey)
}

/**
 * Set permissions for a staff member
 * If permissions array is empty and subrole is provided, uses preset permissions
 */
export async function setStaffPermissions(
  membershipId: string,
  permissionKeys: StaffPermissionKey[],
  staffSubrole?: StaffSubrole | null
): Promise<void> {
  // First, ensure all permission records exist in the database
  await ensurePermissionsExist()

  // Get all permission IDs
  const permissions = await prisma.staffPermission.findMany({
    where: {
      key: {
        in: permissionKeys,
      },
    },
  })

  const permissionIds = permissions.map((p) => p.id)

  // Delete existing permissions for this membership
  await prisma.staffPermissionAssignment.deleteMany({
    where: {
      membershipId,
    },
  })

  // Create new permission assignments
  if (permissionIds.length > 0) {
    await prisma.staffPermissionAssignment.createMany({
      data: permissionIds.map((permissionId) => ({
        id: `spa-${membershipId}-${permissionId}-${Date.now()}`,
        membershipId,
        permissionId,
      })),
      skipDuplicates: true,
    })
  }

  // Update staffSubrole if provided
  if (staffSubrole !== undefined) {
    await prisma.userOrgMembership.update({
      where: { id: membershipId },
      data: { staffSubrole },
    })
  }
}

/**
 * Ensure all permission records exist in the database
 * This should be called during migrations or initialization
 */
export async function ensurePermissionsExist(): Promise<void> {
  const permissionKeys = Object.keys(PERMISSION_DEFINITIONS) as StaffPermissionKey[]

  for (const key of permissionKeys) {
    const definition = PERMISSION_DEFINITIONS[key]
    await prisma.staffPermission.upsert({
      where: { key },
      update: {
        name: definition.name,
        description: definition.description,
        category: 'pages',
        updatedAt: new Date(),
      },
      create: {
        id: `sp-${key}-${Date.now()}`,
        key,
        name: definition.name,
        description: definition.description,
        category: 'pages',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    })
  }
}

/**
 * Get all available permissions
 */
export async function getAllPermissions() {
  return prisma.staffPermission.findMany({
    orderBy: {
      name: 'asc',
    },
  })
}

