export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/mail'
import { logger } from '@/lib/logger'
import { sanitizeText, MAX_STRING_LENGTHS } from '@/lib/input-validation'
import { withRateLimit } from '@/lib/api-middleware'
import crypto from 'crypto'

// POST /api/owner/support/tickets/[id]/respond - Respond to a support ticket
async function handlePOST(
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
    const { responseBody } = body

    if (!responseBody || !responseBody.trim()) {
      return NextResponse.json({ error: 'Response body is required' }, { status: 400 })
    }

    // Sanitize input
    const sanitizedResponseBody = sanitizeText(responseBody, MAX_STRING_LENGTHS.body)

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

    // Create the response
    const response = await prisma.supportTicketResponse.create({
      data: {
        id: crypto.randomUUID(),
        ticketId: ticketId,
        body: sanitizedResponseBody,
        createdById: session.user.id
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    // Update ticket's updatedAt timestamp
    await prisma.supportTicket.update({
      where: { id: ticketId },
      data: { updatedAt: new Date() }
    })

    // Send email notification to the ticket creator
    if (ticket.createdBy?.email) {
      try {
        const { generateEmailTemplate } = await import('@/lib/email-template')
        const content = `
          <div style="margin-bottom: 16px;">
            <p style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280; font-weight: 500;">Ticket:</p>
            <p style="margin: 0 0 16px 0; font-size: 16px; color: #111827; font-weight: 600;">${ticket.subject}</p>
          </div>
          <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-top: 16px;">
            <p style="margin: 0; font-size: 14px; color: #6b7280; font-weight: 500; margin-bottom: 8px;">Our Response:</p>
            <div style="font-size: 15px; color: #374151; line-height: 1.6; white-space: pre-wrap;">
              ${responseBody}
            </div>
          </div>
        `
        
        const html = await generateEmailTemplate({
          title: 'Support Ticket Response',
          description: `Hello ${ticket.createdBy.name || 'there'},<br><br>We have responded to your support ticket.`,
          content,
          footerText: 'You can view the full conversation and respond by logging into your account.'
        })
        
        await sendEmail({
          to: ticket.createdBy.email,
          subject: `Response to your support ticket: ${ticket.subject}`,
          html
        })
      } catch (emailError: any) {
        logger.error('Error sending email notification', emailError)
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error: any) {
    logger.error('Error responding to support ticket', error)
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

export const POST = withRateLimit(handlePOST)
