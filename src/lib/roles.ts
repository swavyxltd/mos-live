import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from './auth'
import { getUserRoleInOrg, getActiveOrgId } from './org'
import { Role } from '@prisma/client'

export async function requireAuth(request: NextRequest) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  return session
}

export function requireRole(requiredRoles: Role[], orgId?: string) {
  return async (request: NextRequest) => {
    const session = await requireAuth(request)
    if (session instanceof NextResponse) return session
    
    const user = session.user
    
    // SuperAdmin can access everything
    if (user.isSuperAdmin) {
      return session
    }
    
    // If no orgId provided, get active org
    const activeOrgId = orgId || await getActiveOrgId(session.user.id)
    if (!activeOrgId) {
      return NextResponse.json({ error: 'No organisation selected' }, { status: 400 })
    }

    const userRole = await getUserRoleInOrg(user.id, activeOrgId)
    if (!userRole) {
      return NextResponse.json({ error: 'Not a member of this organisation' }, { status: 403 })
    }
    
    if (!requiredRoles.includes(userRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }
    
    return session
  }
}

export async function requireOrg(request: NextRequest) {
  const orgId = await getActiveOrgId()
  if (!orgId) {
    return NextResponse.json({ error: 'No organisation selected' }, { status: 400 })
  }
  return orgId
}

export function hasRole(userRole: Role, requiredRoles: Role[]): boolean {
  return requiredRoles.includes(userRole)
}

export function canAccessOwnerFeatures(userRole: Role, isSuperAdmin: boolean): boolean {
  return isSuperAdmin || userRole === 'OWNER'
}

/**
 * Require that the user is a super admin (owner)
 * Use this for all /api/owner/** routes
 */
export async function requireOwner(request: NextRequest) {
  const session = await requireAuth(request)
  if (session instanceof NextResponse) return session
  
  if (!session.user.isSuperAdmin) {
    return NextResponse.json({ error: 'Unauthorized - Owner access required' }, { status: 403 })
  }
  
  return session
}

/**
 * Require that the user has a specific role in the organisation
 * This is a convenience wrapper around requireRole that also returns the role
 */
export async function requireRoleInOrg(request: NextRequest, requiredRoles: Role[]) {
  const session = await requireRole(requiredRoles)(request)
  if (session instanceof NextResponse) return session
  
  const orgId = await getActiveOrgId(session.user.id)
  if (!orgId) {
    return NextResponse.json({ error: 'No organisation selected' }, { status: 400 })
  }
  
  const userRole = await getUserRoleInOrg(session.user.id, orgId)
  if (!userRole) {
    return NextResponse.json({ error: 'Not a member of this organisation' }, { status: 403 })
  }
  
  return { session, userRole, orgId }
}
