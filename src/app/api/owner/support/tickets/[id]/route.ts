export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/mail'
import { logger } from '@/lib/logger'
import { withRateLimit } from '@/lib/api-middleware'

// GET /api/owner/support/tickets/[id] - Get a specific support ticket
async function handleGET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Resolve params if it's a Promise (Next.js 15+)
    const resolvedParams = params instanceof Promise ? await params : params
    const ticketId = resolvedParams.id
    
    if (!ticketId) {
      return NextResponse.json({ error: 'Ticket ID is required' }, { status: 400 })
    }

    // Check if user is an owner/super admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        isSuperAdmin: true
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (!user.isSuperAdmin) {
      return NextResponse.json({ error: 'Access denied. Owner privileges required.' }, { status: 403 })
    }

    // Get the ticket
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        User: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        Org: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        },
        SupportTicketResponse: {
          include: {
            User: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    })

    if (!ticket) {
      logger.warn('Ticket not found', { ticketId, userId: session.user.id })
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    logger.info('Successfully fetched support ticket', { ticketId, ticketNumber: ticket.ticketNumber })
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

// PATCH /api/owner/support/tickets/[id] - Update support ticket status
async function handlePATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Resolve params if it's a Promise (Next.js 15+)
    const resolvedParams = params instanceof Promise ? await params : params
    const ticketId = resolvedParams.id
    
    if (!ticketId) {
      return NextResponse.json({ error: 'Ticket ID is required' }, { status: 400 })
    }
    const body = await request.json()
    const { status } = body

    if (!status || !['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    // Check if user is an owner/super admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        isSuperAdmin: true
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (!user.isSuperAdmin) {
      return NextResponse.json({ error: 'Access denied. Owner privileges required.' }, { status: 403 })
    }

    // Get the ticket and verify ownership
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        User: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        Org: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      }
    })

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    // Update the ticket status
    const updatedTicket = await prisma.supportTicket.update({
      where: { id: ticketId },
      data: { 
        status: status,
        updatedAt: new Date()
      },
      include: {
        User: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        Org: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        },
        SupportTicketResponse: {
          include: {
            User: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    })

    // Send email notification to the ticket creator about status change
    if (ticket.User?.email && ticket.status !== status) {
      try {
        const statusMessages = {
          'OPEN': 'Your support ticket has been reopened.',
          'IN_PROGRESS': 'We are now working on your support ticket.',
          'RESOLVED': 'Your support ticket has been resolved.',
          'CLOSED': 'Your support ticket has been resolved and closed.'
        }

        const { generateEmailTemplate } = await import('@/lib/email-template')
        const content = `
          <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-top: 16px;">
            <p style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280; font-weight: 500;">Subject:</p>
            <p style="margin: 0 0 12px 0; font-size: 16px; color: #111827; font-weight: 600;">${ticket.subject}</p>
            <p style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280; font-weight: 500;">Status:</p>
            <p style="margin: 0 0 12px 0; font-size: 16px; color: #111827; font-weight: 600;">${status.replace('_', ' ')}</p>
            <p style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280; font-weight: 500;">Ticket Number:</p>
            <p style="margin: 0 0 12px 0; font-size: 18px; color: #111827; font-weight: 700;">${ticket.ticketNumber}</p>
            <p style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280; font-weight: 500;">Organisation:</p>
            <p style="margin: 0; font-size: 16px; color: #111827; font-weight: 600;">${ticket.Org?.name || 'N/A'}</p>
          </div>
        `
        
        const html = await generateEmailTemplate({
          title: 'Update on Your Support Ticket',
          description: `Hello ${ticket.User?.name || 'there'},<br><br>${statusMessages[status as keyof typeof statusMessages]}`,
          content,
          footerText: 'You can view the full conversation and any responses by logging into your account.'
        })
        
        await sendEmail({
          to: ticket.User.email,
          subject: `[${ticket.ticketNumber}] Update on your support ticket: ${ticket.subject}`,
          html
        })
      } catch (emailError: any) {
        logger.error('Error sending email notification', emailError)
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json(updatedTicket)
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

export const GET = withRateLimit(handleGET)
export const PATCH = withRateLimit(handlePATCH)
