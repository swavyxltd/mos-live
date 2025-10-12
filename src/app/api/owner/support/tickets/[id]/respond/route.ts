import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/mail'

// POST /api/owner/support/tickets/[id]/respond - Respond to a support ticket
export async function POST(
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
    const { responseBody } = body

    if (!responseBody || !responseBody.trim()) {
      return NextResponse.json({ error: 'Response body is required' }, { status: 400 })
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

    // Check if user has access to this ticket's organization
    if (!user.isSuperAdmin && !user.ownedOrgs.some(org => org.id === ticket.orgId)) {
      return NextResponse.json({ error: 'Access denied to this ticket' }, { status: 403 })
    }

    // Create the response
    const response = await prisma.supportTicketResponse.create({
      data: {
        ticketId: ticketId,
        body: responseBody,
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
        await sendEmail({
          to: ticket.createdBy.email,
          subject: `Response to your support ticket: ${ticket.subject}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">Support Ticket Response</h2>
              <p>Hello ${ticket.createdBy.name || 'there'},</p>
              <p>We have responded to your support ticket: <strong>${ticket.subject}</strong></p>
              
              <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
                <h3 style="margin-top: 0;">Our Response:</h3>
                <p style="white-space: pre-wrap;">${responseBody}</p>
              </div>
              
              <p>You can view the full conversation and respond by logging into your account.</p>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                <p style="color: #666; font-size: 14px;">
                  Best regards,<br>
                  Madrasah OS Support Team
                </p>
              </div>
            </div>
          `
        })
      } catch (emailError) {
        console.error('Error sending email notification:', emailError)
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error('Error responding to support ticket:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
