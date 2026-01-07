export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveOrg, getUserRoleInOrg } from '@/lib/org'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { withRateLimit } from '@/lib/api-middleware'

// GET /api/events/pending - Get pending event requests (admin only)
async function handleGET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const org = await getActiveOrg(session.user.id)
    if (!org) {
      return NextResponse.json({ error: 'No organisation found' }, { status: 404 })
    }

    // Check if user is admin/owner
    const userRole = await getUserRoleInOrg(session.user.id, org.id)
    if (userRole !== 'ADMIN' && userRole !== 'OWNER') {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 })
    }

    // Get pending events with creator info
    const pendingEvents = await prisma.event.findMany({
      where: {
        orgId: org.id,
        status: 'PENDING'
      },
      include: {
        Class: {
          select: {
            id: true,
            name: true
          }
        },
        // Get creator info
        // Note: We'll need to join with User table via createdBy
      },
      orderBy: { createdAt: 'desc' }
    })

    // Get creator details for each event
    const eventsWithCreator = await Promise.all(
      pendingEvents.map(async (event) => {
        let creator = null
        if (event.createdBy) {
          creator = await prisma.user.findUnique({
            where: { id: event.createdBy },
            select: {
              id: true,
              name: true,
              email: true
            }
          })
        }
        return {
          ...event,
          creator
        }
      })
    )

    return NextResponse.json(eventsWithCreator)
  } catch (error: any) {
    logger.error('Error fetching pending events', error)
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

