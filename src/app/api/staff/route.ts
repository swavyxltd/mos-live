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

    const org = await getActiveOrg()
    if (!org) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 })
    }

    // Get staff members (ADMIN and STAFF roles)
    const memberships = await prisma.userOrgMembership.findMany({
      where: {
        orgId: org.id,
        role: { in: ['ADMIN', 'STAFF'] },
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

