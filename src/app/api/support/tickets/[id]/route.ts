import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getActiveOrg } from '@/lib/org'
import { logger } from '@/lib/logger'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Resolve params if it's a Promise (Next.js 15+)
    const resolvedParams = params instanceof Promise ? await params : params
    const ticketId = resolvedParams.id

    logger.info('Fetching support ticket', { ticketId, userId: session.user.id })

    if (!ticketId) {
      logger.error('Ticket ID is missing', { params, resolvedParams })
      return NextResponse.json({ error: 'Ticket ID is required' }, { status: 400 })
    }

    // Get user's active org
    const org = await getActiveOrg(session.user.id)
    if (!org) {
      logger.warn('No active organization found', { userId: session.user.id })
      return NextResponse.json({ error: 'No active organization' }, { status: 400 })
    }

    // Fetch the ticket
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        User: true,
        Org: true,
        SupportTicketResponse: {
          include: {
            User: true
          },
          orderBy: {
            createdAt: 'asc'
          }
        }
      }
    })

    if (!ticket) {
      logger.warn('Ticket not found', { ticketId, userId: session.user.id, orgId: org.id })
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    // Check if user has access to this ticket
    // User must be the creator or belong to the same org
    if (ticket.orgId !== org.id) {
      logger.warn('Access denied - org mismatch', { 
        ticketId, 
        userId: session.user.id, 
        ticketOrgId: ticket.orgId, 
        userOrgId: org.id 
      })
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Transform the response to match frontend expectations
    const transformedTicket = {
      ...ticket,
      createdBy: ticket.User,
      org: ticket.Org,
      responses: ticket.SupportTicketResponse.map((r: any) => ({
        ...r,
        createdBy: r.User
      }))
    }

    logger.info('Successfully fetched support ticket', { ticketId, ticketNumber: ticket.ticketNumber })
    return NextResponse.json(transformedTicket)
  } catch (error: any) {
    logger.error('Error fetching support ticket:', {
      error: error?.message,
      stack: error?.stack,
      name: error?.name
    })
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { 
        error: 'Failed to fetch ticket',
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}
