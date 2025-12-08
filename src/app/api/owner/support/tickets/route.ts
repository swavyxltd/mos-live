export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { withRateLimit } from '@/lib/api-middleware'

// GET /api/owner/support/tickets - Get all support tickets from all organisations owned by the user
async function handleGET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is an owner/super admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        ownedOrgs: true,
        roleHints: true
      }
    })

    if (!user || (!user.isSuperAdmin && user.ownedOrgs.length === 0)) {
      return NextResponse.json({ error: 'Access denied. Owner privileges required.' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const orgId = searchParams.get('orgId')

    // Build where clause
    let whereClause: any = {}

    // If user is super admin, get all tickets
    // If user is owner, get tickets from their organisations only
    if (user.isSuperAdmin) {
      // Super admin can see all tickets
    } else {
      // Owner can only see tickets from their organisations
      whereClause.orgId = {
        in: user.ownedOrgs.map(org => org.id)
      }
    }

    // Filter by status if provided
    if (status) {
      whereClause.status = status
    }

    // Filter by organisation if provided
    if (orgId) {
      whereClause.orgId = orgId
    }

    const tickets = await prisma.supportTicket.findMany({
      where: whereClause,
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        org: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        },
        responses: {
          include: {
            createdBy: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(tickets)
  } catch (error: any) {
    logger.error('Error fetching owner support tickets', error)
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { 
        error: 'Internal server error',
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}

export const GET = withRateLimit(handleGET)
