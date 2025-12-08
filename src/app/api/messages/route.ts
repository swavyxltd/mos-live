export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveOrg } from '@/lib/org'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { withRateLimit } from '@/lib/api-middleware'

// GET /api/messages - Get messages for the current org with pagination
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

    // Verify user has appropriate role (staff/admin can see all messages, parents can only see their own)
    const { getUserRoleInOrg } = await import('@/lib/org')
    const userRole = await getUserRoleInOrg(session.user.id, org.id)
    
    if (!userRole || !['ADMIN', 'OWNER', 'STAFF', 'PARENT'].includes(userRole)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Get pagination parameters
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '10', 10)
    const skip = (page - 1) * limit

    // Build where clause - parents can only see messages sent to them
    let whereClause: any = { orgId: org.id }
    if (userRole === 'PARENT') {
      whereClause.recipientId = session.user.id
    }

    // Get total count
    const total = await prisma.message.count({
      where: whereClause
    })

    // Get paginated messages
    const messages = await prisma.message.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    })

    // Serialize dates to ISO strings
    const serializedMessages = messages.map(msg => ({
      ...msg,
      createdAt: msg.createdAt.toISOString(),
      updatedAt: msg.updatedAt.toISOString()
    }))

    const totalPages = total > 0 ? Math.ceil(total / limit) : 1

    return NextResponse.json({
      messages: serializedMessages,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    })
  } catch (error: any) {
    logger.error('Error fetching messages', error)
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

