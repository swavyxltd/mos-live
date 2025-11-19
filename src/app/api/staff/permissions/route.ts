import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/roles'
import { setStaffPermissions, getStaffPermissionsFromDb, ensurePermissionsExist } from '@/lib/staff-permissions-db'
import { StaffPermissionKey, getStaffPermissionKeys, StaffSubrole } from '@/types/staff-roles'
import { logger } from '@/lib/logger'

// GET: Get permissions for a staff member
async function handleGET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const orgId = searchParams.get('orgId')

    if (!userId || !orgId) {
      return NextResponse.json(
        { error: 'userId and orgId are required' },
        { status: 400 }
      )
    }

    // Check if requester has permission (must be admin in the org)
    const requesterMembership = await prisma.userOrgMembership.findUnique({
      where: {
        userId_orgId: {
          userId: session.user.id,
          orgId,
        },
      },
    })

    if (!requesterMembership || (requesterMembership.role !== 'ADMIN' && !session.user.isSuperAdmin)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const permissions = await getStaffPermissionsFromDb(userId, orgId)

    return NextResponse.json({ permissions })
  } catch (error: any) {
    logger.error('Error getting staff permissions', error)
    return NextResponse.json(
      { error: 'Failed to get permissions' },
      { status: 500 }
    )
  }
}

// POST/PUT: Set permissions for a staff member
async function handlePOST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { membershipId, permissionKeys, staffSubrole } = body

    if (!membershipId) {
      return NextResponse.json(
        { error: 'membershipId is required' },
        { status: 400 }
      )
    }

    // Get membership to verify org
    const membership = await prisma.userOrgMembership.findUnique({
      where: { id: membershipId },
      include: { Org: true },
    })

    if (!membership) {
      return NextResponse.json(
        { error: 'Membership not found' },
        { status: 404 }
      )
    }

    // Check if requester has permission (must be admin in the org)
    const requesterMembership = await prisma.userOrgMembership.findUnique({
      where: {
        userId_orgId: {
          userId: session.user.id,
          orgId: membership.orgId,
        },
      },
    })

    if (!requesterMembership || (requesterMembership.role !== 'ADMIN' && !session.user.isSuperAdmin)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Ensure permissions exist in database
    await ensurePermissionsExist()

    // If permissionKeys not provided but staffSubrole is, use preset (base permissions)
    let finalPermissionKeys: StaffPermissionKey[] = permissionKeys || []
    if (!permissionKeys && staffSubrole) {
      finalPermissionKeys = getStaffPermissionKeys(staffSubrole as StaffSubrole)
    } else if (permissionKeys && staffSubrole) {
      // Ensure base permissions are always included
      const basePermissions = getStaffPermissionKeys(staffSubrole as StaffSubrole)
      finalPermissionKeys = [...new Set([...basePermissions, ...permissionKeys])]
    }

    // Set permissions
    await setStaffPermissions(membershipId, finalPermissionKeys, staffSubrole)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    logger.error('Error setting staff permissions', error)
    return NextResponse.json(
      { error: 'Failed to set permissions' },
      { status: 500 }
    )
  }
}

export const GET = handleGET
export const POST = handlePOST
export const PUT = handlePOST

