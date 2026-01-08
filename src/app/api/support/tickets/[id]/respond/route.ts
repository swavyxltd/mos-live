export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveOrg } from '@/lib/org'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/mail'
import { logger } from '@/lib/logger'
import { sanitizeText, MAX_STRING_LENGTHS } from '@/lib/input-validation'
import { withRateLimit } from '@/lib/api-middleware'
import crypto from 'crypto'

// POST /api/support/tickets/[id]/respond - Respond to a support ticket (for users)
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

    const org = await getActiveOrg(session.user.id)
    if (!org) {
      return NextResponse.json({ error: 'No organisation found' }, { status: 404 })
    }

    // Get the ticket and verify it belongs to the org
    const ticket = await prisma.supportTicket.findFirst({
      where: {
        id: ticketId,
        orgId: org.id
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
        }
      }
    })

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    // Check if ticket is closed
    if (ticket.status === 'CLOSED') {
      return NextResponse.json({ error: 'Cannot add response to a closed ticket' }, { status: 400 })
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
        User: {
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

    // Send email notification to support@madrasah.io about the new response
    try {
      const { generateEmailTemplate } = await import('@/lib/email-template')
      const content = `
        <div style="margin-bottom: 16px;">
          <p style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280; font-weight: 500;">Ticket Number:</p>
          <p style="margin: 0 0 12px 0; font-size: 18px; color: #111827; font-weight: 700;">${ticket.ticketNumber}</p>
          <p style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280; font-weight: 500;">Subject:</p>
          <p style="margin: 0 0 16px 0; font-size: 16px; color: #111827; font-weight: 600;">${ticket.subject}</p>
        </div>
        <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-top: 16px;">
          <p style="margin: 0; font-size: 14px; color: #6b7280; font-weight: 500; margin-bottom: 8px;">New Response from ${ticket.User?.name || 'User'}:</p>
          <div style="font-size: 15px; color: #374151; line-height: 1.6; white-space: pre-wrap;">
            ${sanitizedResponseBody}
          </div>
        </div>
      `
      
      const html = await generateEmailTemplate({
        title: 'New Response on Support Ticket',
        description: `A user has responded to support ticket ${ticket.ticketNumber}.`,
        content,
        footerText: `You can view and respond to this ticket in the owner portal.`
      })
      
      await sendEmail({
        to: 'support@madrasah.io',
        subject: `[${ticket.ticketNumber}] New response on support ticket: ${ticket.subject}`,
        html,
        forceSend: true // Always send support ticket emails, even in demo mode
      })
    } catch (emailError: any) {
      logger.error('Error sending email notification', emailError)
      // Don't fail the request if email fails
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

