export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveOrg } from '@/lib/org'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { sanitizeText, MAX_STRING_LENGTHS } from '@/lib/input-validation'
import { withRateLimit } from '@/lib/api-middleware'

// GET /api/support/tickets - Get all support tickets for the current org
async function handleGET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const org = await getActiveOrg()
    if (!org) {
      return NextResponse.json({ error: 'No organisation found' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const role = searchParams.get('role')

    let whereClause: any = { orgId: org.id }

    // Filter by status if provided
    if (status) {
      whereClause.status = status
    }

    // Filter by role if provided
    if (role) {
      whereClause.role = role
    }

    const tickets = await prisma.supportTicket.findMany({
      where: whereClause,
      include: {
        User: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(tickets)
  } catch (error: any) {
    logger.error('Error fetching support tickets', error)
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

// POST /api/support/tickets - Create a new support ticket
async function handlePOST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const org = await getActiveOrg()
    if (!org) {
      return NextResponse.json({ error: 'No organisation found' }, { status: 404 })
    }

    const body = await request.json()
    const { subject, body: ticketBody, role } = body

    if (!subject || !ticketBody) {
      return NextResponse.json({ error: 'Subject and body are required' }, { status: 400 })
    }

    // Sanitize inputs
    const sanitizedSubject = sanitizeText(subject, MAX_STRING_LENGTHS.title)
    const sanitizedBody = sanitizeText(ticketBody, MAX_STRING_LENGTHS.body)

    const ticket = await prisma.supportTicket.create({
      data: {
        orgId: org.id,
        createdById: session.user.id,
        role: role || 'USER',
        subject: sanitizedSubject,
        body: sanitizedBody,
        status: 'OPEN'
      },
      include: {
        User: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json(ticket, { status: 201 })
  } catch (error: any) {
    logger.error('Error creating support ticket', error)
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
export const POST = withRateLimit(handlePOST)
