import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getActiveOrg } from '@/lib/org-db'
import { logger } from '@/lib/logger'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const ticketId = params.id

    // Get user's active org
    const org = await getActiveOrg(session.user.id)
    if (!org) {
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
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    // Check if user has access to this ticket
    // User must be the creator or belong to the same org
    if (ticket.orgId !== org.id) {
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

    return NextResponse.json(transformedTicket)
  } catch (error) {
    logger.error('Error fetching support ticket:', error)
    return NextResponse.json(
      { error: 'Failed to fetch ticket' },
      { status: 500 }
    )
  }
}
