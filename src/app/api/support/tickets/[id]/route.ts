export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveOrg } from '@/lib/org'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { sanitizeText, MAX_STRING_LENGTHS } from '@/lib/input-validation'
import { withRateLimit } from '@/lib/api-middleware'

// GET /api/support/tickets/[id] - Get a specific support ticket
async function handleGET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const org = await getActiveOrg()
    if (!org) {
      return NextResponse.json({ error: 'No organisation found' }, { status: 404 })
    }

    const ticket = await prisma.supportTicket.findFirst({
      where: {
        id: params.id,
        orgId: org.id
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

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    return NextResponse.json(ticket)
  } catch (error: any) {
    logger.error('Error fetching support ticket', error)
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

// PATCH /api/support/tickets/[id] - Update a support ticket
async function handlePATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const { status, subject, body: ticketBody } = body

    // Check if ticket exists and belongs to the org
    const existingTicket = await prisma.supportTicket.findFirst({
      where: {
        id: params.id,
        orgId: org.id
      }
    })

    if (!existingTicket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    const updateData: any = {}
    if (status) updateData.status = status
    if (subject) updateData.subject = sanitizeText(subject, MAX_STRING_LENGTHS.title)
    if (ticketBody) updateData.body = sanitizeText(ticketBody, MAX_STRING_LENGTHS.body)

    const ticket = await prisma.supportTicket.update({
      where: { id: params.id },
      data: updateData,
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

    return NextResponse.json(ticket)
  } catch (error: any) {
    logger.error('Error updating support ticket', error)
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

// DELETE /api/support/tickets/[id] - Delete a support ticket
async function handleDELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const org = await getActiveOrg()
    if (!org) {
      return NextResponse.json({ error: 'No organisation found' }, { status: 404 })
    }

    // Check if ticket exists and belongs to the org
    const existingTicket = await prisma.supportTicket.findFirst({
      where: {
        id: params.id,
        orgId: org.id
      }
    })

    if (!existingTicket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    await prisma.supportTicket.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ message: 'Ticket deleted successfully' })
  } catch (error: any) {
    logger.error('Error deleting support ticket', error)
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
export const PATCH = withRateLimit(handlePATCH)
export const DELETE = withRateLimit(handleDELETE)
