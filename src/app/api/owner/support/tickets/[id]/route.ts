import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/mail'

// PATCH /api/owner/support/tickets/[id] - Update support ticket status
export async function PATCH(
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

    // Check if user has access to this ticket's organization
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

        await sendEmail({
          to: ticket.createdBy.email,
          subject: `Support ticket status update: ${ticket.subject}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">Support Ticket Status Update</h2>
              <p>Hello ${ticket.createdBy.name || 'there'},</p>
              <p>${statusMessages[status as keyof typeof statusMessages]}</p>
              
              <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
                <h3 style="margin-top: 0;">Ticket Details:</h3>
                <p><strong>Subject:</strong> ${ticket.subject}</p>
                <p><strong>Status:</strong> ${status.replace('_', ' ')}</p>
                <p><strong>Organization:</strong> ${ticket.org?.name}</p>
              </div>
              
              <p>You can view the full conversation and any responses by logging into your account.</p>
              
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

    return NextResponse.json(updatedTicket)
  } catch (error) {
    console.error('Error updating support ticket:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
