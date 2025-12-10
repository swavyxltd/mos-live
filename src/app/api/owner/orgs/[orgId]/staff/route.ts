import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { withRateLimit } from '@/lib/api-middleware'

// GET /api/owner/orgs/[orgId]/staff - Get all staff for a specific org (owner only)
async function handleGET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> | { orgId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    // Only allow super admins (owners)
    if (!session?.user?.id || !session.user.isSuperAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Resolve params if it's a Promise (Next.js 15+)
    const resolvedParams = params instanceof Promise ? await params : params
    const { orgId } = resolvedParams
    
    if (!orgId) {
      return NextResponse.json({ error: 'Organisation ID is required' }, { status: 400 })
    }

    // Verify org exists
    const org = await prisma.org.findUnique({
      where: { id: orgId },
      select: { id: true, name: true }
    })

    if (!org) {
      return NextResponse.json(
        { error: 'Organisation not found' },
        { status: 404 }
      )
    }

    // Get all staff members (ADMIN and STAFF roles) for this org
    const memberships = await prisma.userOrgMembership.findMany({
      where: {
        orgId,
        role: { in: ['ADMIN', 'STAFF'] }
      },
      include: {
        User: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            createdAt: true
          }
        },
        _count: {
          select: {
            Class: true
          }
        }
      },
      orderBy: {
        User: {
          name: 'asc'
        }
      }
    })

    // Get class counts and student counts for each staff member
    const staffWithStats = await Promise.all(
      memberships.map(async (membership) => {
        // Get classes taught by this staff member
        const classes = await prisma.class.findMany({
          where: {
            orgId,
            teacherId: membership.User.id,
            isArchived: false
          },
          include: {
            _count: {
              select: {
                StudentClass: true
              }
            }
          }
        })

        const classesCount = classes.length
        const studentsCount = classes.reduce((sum, cls) => sum + cls._count.StudentClass, 0)

        // Determine subject from classes or use default
        const subjects = classes.map(c => c.name).join(', ') || 'General'

        return {
          id: membership.User.id,
          name: membership.User.name || membership.User.email || 'Unknown',
          email: membership.User.email,
          phone: membership.User.phone || '',
          subject: subjects,
          experience: 0, // Not stored in DB
          status: membership.role === 'ADMIN' ? 'ACTIVE' : 'ACTIVE',
          classesCount,
          studentsCount,
          createdAt: membership.User.createdAt
        }
      })
    )

    return NextResponse.json(staffWithStats)
  } catch (error: any) {
    logger.error('Error fetching org staff', error)
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

