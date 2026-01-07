export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveOrg, getUserRoleInOrg } from '@/lib/org'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { withRateLimit } from '@/lib/api-middleware'

// PATCH /api/events/[id]/review - Approve or decline an event request (admin only)
async function handlePATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const org = await getActiveOrg(session.user.id)
    if (!org) {
      return NextResponse.json({ error: 'No organisation found' }, { status: 404 })
    }

    // Check if user is admin/owner
    const userRole = await getUserRoleInOrg(session.user.id, org.id)
    if (userRole !== 'ADMIN' && userRole !== 'OWNER') {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 })
    }

    const resolvedParams = await Promise.resolve(params)
    const eventId = resolvedParams.id

    const body = await request.json()
    const { action } = body // 'approve' or 'decline'

    if (!action || !['approve', 'decline'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "approve" or "decline"' },
        { status: 400 }
      )
    }

    // Check if event exists and is pending
    const event = await prisma.event.findFirst({
      where: {
        id: eventId,
        orgId: org.id,
        status: 'PENDING'
      }
    })

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found or already reviewed' },
        { status: 404 }
      )
    }

    // Update event status
    const newStatus = action === 'approve' ? 'APPROVED' : 'DECLINED'
    const updatedEvent = await prisma.event.update({
      where: { id: eventId },
      data: {
        status: newStatus,
        reviewedBy: session.user.id,
        reviewedAt: new Date(),
        updatedAt: new Date()
      },
      include: {
        Class: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    // If approved and it's a meeting, send notification to parent
    if (newStatus === 'APPROVED' && event.type === 'MEETING' && event.studentId) {
      try {
        const student = await prisma.student.findUnique({
          where: { id: event.studentId },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            primaryParentId: true
          }
        })

        if (student?.primaryParentId) {
          const parent = await prisma.user.findUnique({
            where: { id: student.primaryParentId },
            select: {
              id: true,
              email: true,
              name: true
            }
          })

          if (parent && parent.email) {
            const eventDate = new Date(event.date)
            const formattedDate = eventDate.toLocaleDateString('en-GB', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            })
            // Check if allDay based on startTime/endTime being null
            const isAllDay = !event.startTime && !event.endTime
            const timeStr = isAllDay ? 'All Day' : event.startTime && event.endTime 
              ? `${event.startTime} - ${event.endTime}` 
              : event.startTime || ''

            const messageBody = `You have a meeting scheduled:\n\n${event.title}${event.description ? `\n\n${event.description}` : ''}\n\nDate: ${formattedDate}${timeStr ? `\nTime: ${timeStr}` : ''}`
            
            const { sendEmail } = await import('@/lib/mail')
            const { generateEmailTemplate } = await import('@/lib/email-template')
            
            const emailHtml = await generateEmailTemplate({
              title: `Meeting Scheduled: ${event.title}`,
              description: messageBody,
              footerText: 'Jazakallahu Khairan, The Madrasah Team'
            })

            await sendEmail({
              to: parent.email,
              subject: `Meeting Scheduled: ${event.title}`,
              html: emailHtml,
              text: messageBody
            })

            // Create message record
            const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            await prisma.message.create({
              data: {
                id: messageId,
                orgId: org.id,
                title: `Meeting: ${event.title}`,
                body: messageBody,
                audience: 'INDIVIDUAL',
                updatedAt: new Date(),
                channel: 'EMAIL',
                status: 'SENT',
                targets: JSON.stringify({
                  parentId: student.primaryParentId,
                  audienceDisplayName: parent.name || parent.email,
                  recipientCount: 1,
                  orgName: org.name
                }),
                createdAt: new Date(),
                updatedAt: new Date()
              }
            })
          }
        }
      } catch (error: any) {
        // Log error but don't fail the review
        logger.error('Error sending meeting notification after approval', error)
      }
    }

    return NextResponse.json({
      ...updatedEvent,
      message: action === 'approve' ? 'Event approved successfully' : 'Event declined'
    })
  } catch (error: any) {
    logger.error('Error reviewing event', error)
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { 
        error: 'Failed to review event',
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}

export const PATCH = withRateLimit(handlePATCH)

