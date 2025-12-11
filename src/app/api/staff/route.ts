import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveOrg } from '@/lib/org'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { withRateLimit } from '@/lib/api-middleware'

async function handleGET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    // Get authenticated user's active org - NEVER trust orgId from query params
    const org = await getActiveOrg(session.user.id)
    if (!org) {
      return NextResponse.json({ error: 'No organisation found' }, { status: 404 })
    }

    // If specific user requested, return membership info for the authenticated user's org
    if (userId) {
      const membership = await prisma.userOrgMembership.findUnique({
        where: {
          userId_orgId: {
            userId,
            orgId: org.id, // CRITICAL: Use authenticated user's orgId, not from query params
          },
        },
        include: {
          User: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              isArchived: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      })

      if (!membership) {
        return NextResponse.json({ error: 'Membership not found' }, { status: 404 })
      }

      return NextResponse.json({
        membership: {
          id: membership.id,
          role: membership.role,
          staffSubrole: membership.staffSubrole,
          isInitialAdmin: membership.isInitialAdmin,
          user: membership.User,
        },
      })
    }

    // Otherwise, get all staff members (or all users if allUsers param is set)
    // org is already set above

    const allUsers = searchParams.get('allUsers') === 'true'

    // Get members - either all users or just staff (ADMIN and STAFF roles)
    const memberships = await prisma.userOrgMembership.findMany({
      where: {
        orgId: org.id,
        ...(allUsers ? {} : { role: { in: ['ADMIN', 'STAFF'] } }),
        User: {
          isArchived: false
        }
      },
      include: {
        User: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        User: {
          name: 'asc'
        }
      }
    })

    const teachers = memberships.map(membership => ({
      id: membership.User.id,
      name: membership.User.name || membership.User.email || 'Unknown',
      email: membership.User.email || ''
    }))

    return NextResponse.json({ teachers })
  } catch (error: any) {
    logger.error('Error fetching staff', error)
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { 
        error: 'Failed to fetch staff',
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}

export const GET = withRateLimit(handleGET)

