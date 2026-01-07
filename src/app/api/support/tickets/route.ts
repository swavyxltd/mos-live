export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveOrg } from '@/lib/org'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { sanitizeText, MAX_STRING_LENGTHS } from '@/lib/input-validation'
import { withRateLimit } from '@/lib/api-middleware'
import { sendEmail } from '@/lib/mail'
import { generateEmailTemplate } from '@/lib/email-template'
import crypto from 'crypto'

// Generate a unique ticket number
function generateTicketNumber(): string {
  const date = new Date()
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '') // YYYYMMDD
  const randomStr = crypto.randomBytes(3).toString('hex').toUpperCase() // 6 character hex string
  return `TKT-${dateStr}-${randomStr}`
}

// GET /api/support/tickets - Get all support tickets for the current org
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

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const role = searchParams.get('role')

    let whereClause: any = { 
      orgId: org.id,
      // Only show tickets created by the current user
      createdById: session.user.id
    }

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

    const org = await getActiveOrg(session.user.id)
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

    // Get user info for email notification
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true
      }
    })

    // Generate unique ticket number
    let ticketNumber: string
    let isUnique = false
    let attempts = 0
    while (!isUnique && attempts < 10) {
      ticketNumber = generateTicketNumber()
      const existing = await prisma.supportTicket.findUnique({
        where: { ticketNumber }
      })
      if (!existing) {
        isUnique = true
      }
      attempts++
    }

    if (!isUnique) {
      // Fallback: use UUID-based ticket number if we can't generate a unique one
      ticketNumber = `TKT-${crypto.randomUUID().substring(0, 8).toUpperCase()}`
    }

    const ticket = await prisma.supportTicket.create({
      data: {
        id: crypto.randomUUID(),
        ticketNumber: ticketNumber!,
        orgId: org.id,
        createdById: session.user.id,
        role: role || 'USER',
        subject: sanitizedSubject,
        updatedAt: new Date(),
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

    // Send email notification to support@madrasah.io
    try {
      const roleDisplay = role === 'ADMIN' ? 'Admin' : role === 'STAFF' ? 'Staff' : role === 'PARENT' ? 'Parent' : 'User'
      
      // Escape HTML to prevent XSS
      const escapeHtml = (text: string) => {
        const map: Record<string, string> = {
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#039;'
        }
        return text.replace(/[&<>"']/g, (m) => map[m])
      }
      
      const escapedSubject = escapeHtml(ticket.subject)
      const escapedBody = escapeHtml(ticket.body)
      const escapedUserName = escapeHtml(user?.name || 'Unknown')
      const escapedUserEmail = escapeHtml(user?.email || 'No email')
      const escapedOrgName = escapeHtml(org.name)
      
      const content = `
        <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-top: 16px;">
          <p style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280; font-weight: 500;">Ticket Number:</p>
          <p style="margin: 0 0 12px 0; font-size: 18px; color: #111827; font-weight: 700;">${ticket.ticketNumber}</p>
          <p style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280; font-weight: 500;">Subject:</p>
          <p style="margin: 0 0 12px 0; font-size: 16px; color: #111827; font-weight: 600;">${escapedSubject}</p>
          <p style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280; font-weight: 500;">From:</p>
          <p style="margin: 0 0 12px 0; font-size: 16px; color: #111827; font-weight: 600;">${escapedUserName} (${escapedUserEmail}) - ${roleDisplay}</p>
          <p style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280; font-weight: 500;">Organisation:</p>
          <p style="margin: 0 0 12px 0; font-size: 16px; color: #111827; font-weight: 600;">${escapedOrgName}</p>
          <p style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280; font-weight: 500;">Message:</p>
          <div style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 4px; padding: 12px; margin-top: 8px;">
            <p style="margin: 0; font-size: 15px; color: #374151; line-height: 1.6; white-space: pre-wrap;">${escapedBody}</p>
          </div>
        </div>
      `
      
      // Plain text version for email clients that don't support HTML
      const text = `New Support Ticket Created

Ticket Number: ${ticket.ticketNumber}
Subject: ${ticket.subject}
From: ${user?.name || 'Unknown'} (${user?.email || 'No email'}) - ${roleDisplay}
Organisation: ${org.name}

Message:
${ticket.body}

You can view and respond to this ticket in the owner portal.`
      
      const html = await generateEmailTemplate({
        title: 'New Support Ticket Created',
        description: `A new support ticket has been created and requires your attention.`,
        content,
        footerText: `You can view and respond to this ticket in the owner portal.`
      })
      
      await sendEmail({
        to: 'support@madrasah.io',
        subject: `[${ticket.ticketNumber}] New Support Ticket: ${ticket.subject}`,
        html,
        text
      })
      
      logger.info('Support ticket notification email sent', {
        ticketNumber: ticket.ticketNumber,
        to: 'support@madrasah.io'
      })
    } catch (emailError: any) {
      logger.error('Error sending support ticket notification email', emailError)
      // Don't fail the request if email fails
    }

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
