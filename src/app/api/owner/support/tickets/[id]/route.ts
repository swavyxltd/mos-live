export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/mail'
import { logger } from '@/lib/logger'
import { withRateLimit } from '@/lib/api-middleware'

// PATCH /api/owner/support/tickets/[id] - Update support ticket status
async function handlePATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const ticketId = params.id
    const body = await request.json()
    const { status } = body

    if (!status || !['OPEN', 'IN_PROGRESS', 'CLOSED'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    // Check if user is an owner/super admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        ownedOrgs: true
      }
    })

    if (!user || (!user.isSuperAdmin && user.ownedOrgs.length === 0)) {
      return NextResponse.json({ error: 'Access denied. Owner privileges required.' }, { status: 403 })
    }

    // Get the ticket and verify ownership
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        createdBy: true,
        org: true
      }
    })

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    // Check if user has access to this ticket's organisation
    if (!user.isSuperAdmin && !user.ownedOrgs.some(org => org.id === ticket.orgId)) {
      return NextResponse.json({ error: 'Access denied to this ticket' }, { status: 403 })
    }

    // Update the ticket status
    const updatedTicket = await prisma.supportTicket.update({
      where: { id: ticketId },
      data: { 
        status: status,
        updatedAt: new Date()
      },
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
      }
    })

    // Send email notification to the ticket creator about status change
    if (ticket.createdBy?.email && ticket.status !== status) {
      try {
        const statusMessages = {
          'OPEN': 'Your support ticket has been reopened.',
          'IN_PROGRESS': 'We are now working on your support ticket.',
          'CLOSED': 'Your support ticket has been resolved and closed.'
        }

        const { generateEmailTemplate } = await import('@/lib/email-template')
        const content = `
          <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-top: 16px;">
            <p style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280; font-weight: 500;">Subject:</p>
            <p style="margin: 0 0 12px 0; font-size: 16px; color: #111827; font-weight: 600;">${ticket.subject}</p>
            <p style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280; font-weight: 500;">Status:</p>
            <p style="margin: 0 0 12px 0; font-size: 16px; color: #111827; font-weight: 600;">${status.replace('_', ' ')}</p>
            <p style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280; font-weight: 500;">Organisation:</p>
            <p style="margin: 0; font-size: 16px; color: #111827; font-weight: 600;">${ticket.org?.name || 'N/A'}</p>
          </div>
        `
        
        const html = await generateEmailTemplate({
          title: 'Support Ticket Status Update',
          description: `Hello ${ticket.createdBy.name || 'there'},<br><br>${statusMessages[status as keyof typeof statusMessages]}`,
          content,
          footerText: 'You can view the full conversation and any responses by logging into your account.'
        })
        
        await sendEmail({
          to: ticket.createdBy.email,
          subject: `Support ticket status update: ${ticket.subject}`,
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

export const PATCH = withRateLimit(handlePATCH)
