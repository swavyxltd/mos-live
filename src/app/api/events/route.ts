export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveOrg, getUserRoleInOrg } from '@/lib/org'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { withRateLimit } from '@/lib/api-middleware'
import { randomUUID } from 'crypto'

// GET /api/events - Get all events for the current org
async function handleGET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const org = await getActiveOrg()
    if (!org) {
      return NextResponse.json({ error: 'No organisation found' }, { status: 404 })
    }

    // Check if user is admin/owner
    const userRole = await getUserRoleInOrg(session.user.id, org.id)
    const isAdmin = userRole === 'ADMIN' || userRole === 'OWNER'

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    let whereClause: any = { orgId: org.id }

    // Non-admins only see APPROVED events
    if (!isAdmin) {
      whereClause.status = 'APPROVED'
    }

    if (startDate && endDate) {
      whereClause.date = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    }

    const events = await prisma.event.findMany({
      where: whereClause,
      include: {
        Class: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { date: 'asc' }
    })

    return NextResponse.json(events)
  } catch (error: any) {
    logger.error('Error fetching events', error)
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

// POST /api/events - Create a new event
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
    const { title, description, type, date, startTime, endTime, classId, studentId, allDay } = body

    logger.info('Event creation request', { 
      title, 
      date, 
      type, 
      hasTitle: !!title, 
      hasDate: !!date,
      titleLength: title?.length,
      dateLength: date?.length
    })

    if (!title || !title.trim() || !date || !date.trim()) {
      return NextResponse.json(
        { error: 'Title and date are required' },
        { status: 400 }
      )
    }

    // Validate date
    const eventDate = new Date(date)
    if (isNaN(eventDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      )
    }

    // For meetings, studentId is required
    if (type === 'MEETING' && !studentId) {
      return NextResponse.json(
        { error: 'Student selection is required for meetings' },
        { status: 400 }
      )
    }

    // Validate studentId if provided (for meetings)
    let parentId: string | null = null
    if (studentId) {
      const student = await prisma.student.findFirst({
        where: {
          id: studentId,
          orgId: org.id,
          isArchived: false
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          primaryParentId: true
        }
      })
      if (!student) {
        return NextResponse.json(
          { error: 'Invalid student selected' },
          { status: 400 }
        )
      }
      if (!student.primaryParentId) {
        return NextResponse.json(
          { error: 'Selected student does not have a parent associated' },
          { status: 400 }
        )
      }
      parentId = student.primaryParentId
    }

    // Check if user is a teacher
    const userRole = await getUserRoleInOrg(session.user.id, org.id)
    const membership = await prisma.userOrgMembership.findUnique({
      where: {
        userId_orgId: {
          userId: session.user.id,
          orgId: org.id
        }
      },
      select: {
        staffSubrole: true
      }
    })

    const isTeacher = membership?.staffSubrole === 'TEACHER' || (userRole === 'STAFF' && !membership?.staffSubrole)

    // If user is a teacher, they must specify a classId and it must be one of their assigned classes
    if (isTeacher) {
      if (!classId) {
        return NextResponse.json(
          { error: 'Teachers must select a class for events' },
          { status: 403 }
        )
      }

      // Verify the class belongs to this teacher
      const teacherClass = await prisma.class.findFirst({
        where: {
          id: classId,
          orgId: org.id,
          isArchived: false,
          teacherId: session.user.id
        }
      })

      if (!teacherClass) {
        return NextResponse.json(
          { error: 'You can only create events for classes assigned to you' },
          { status: 403 }
        )
      }
    }

    // Validate classId if provided (for non-teachers)
    if (classId && !isTeacher) {
      const classExists = await prisma.class.findFirst({
        where: {
          id: classId,
          orgId: org.id,
          isArchived: false
        }
      })
      if (!classExists) {
        return NextResponse.json(
          { error: 'Invalid class selected' },
          { status: 400 }
        )
      }
    }

    // Sanitize inputs
    const { sanitizeText, MAX_STRING_LENGTHS } = await import('@/lib/input-validation')
    const sanitizedTitle = sanitizeText(title, MAX_STRING_LENGTHS.name)
    const sanitizedDescription = description ? sanitizeText(description, MAX_STRING_LENGTHS.text) : null

    // Determine event status: teachers create PENDING events, admins/owners create APPROVED events
    const eventStatus = isTeacher ? 'PENDING' : 'APPROVED'

    // Create event - classId is null by default so it shows for all accounts in the org
    // For meetings, classId is null so it only shows to the selected student's parent
    const event = await prisma.event.create({
      data: {
        id: randomUUID(),
        orgId: org.id,
        title: sanitizedTitle,
        description: sanitizedDescription,
        type: type || 'EVENT',
        date: eventDate,
        startTime: allDay ? null : (startTime || null),
        endTime: allDay ? null : (endTime || null),
        classId: classId || null, // null means it's visible to all accounts in the org, otherwise specific class
        studentId: studentId || null, // For meetings, associate with student
        status: eventStatus,
        createdBy: session.user.id,
        updatedAt: new Date(),
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

    // Only send notifications for approved events (not pending requests)
    // For meetings, send announcement and email to the parent
    if (type === 'MEETING' && parentId && eventStatus === 'APPROVED') {
      try {
        const parent = await prisma.user.findUnique({
          where: { id: parentId },
          select: {
            id: true,
            email: true,
            name: true
          }
        })

        if (parent && parent.email) {
          // Format date and time for the message
          const formattedDate = eventDate.toLocaleDateString('en-GB', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          })
          const timeStr = allDay ? 'All Day' : startTime && endTime ? `${startTime} - ${endTime}` : startTime || ''

          // Create announcement message
          const messageBody = `You have a meeting scheduled:\n\n${title}${description ? `\n\n${description}` : ''}\n\nDate: ${formattedDate}${timeStr ? `\nTime: ${timeStr}` : ''}`
          
          // Send announcement via messages API
          const { sendEmail } = await import('@/lib/mail')
          const { generateEmailTemplate } = await import('@/lib/email-template')
          
          const emailHtml = await generateEmailTemplate({
            title: `Meeting Scheduled: ${title}`,
            description: messageBody,
            footerText: 'Jazakallahu Khairan, The Madrasah Team'
          })

          await sendEmail({
            to: parent.email,
            subject: `Meeting Scheduled: ${title}`,
            html: emailHtml,
            text: messageBody
          })

          // Create message record for announcements page
          const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          await prisma.message.create({
            data: {
              id: messageId,
              orgId: org.id,
              title: `Meeting: ${title}`,
              body: messageBody,
              audience: 'INDIVIDUAL',
              updatedAt: new Date(),
              channel: 'EMAIL',
              status: 'SENT',
              targets: JSON.stringify({
                parentId: parentId,
                audienceDisplayName: parent.name || parent.email,
                recipientCount: 1,
                orgName: org.name
              }),
              createdAt: new Date(),
              updatedAt: new Date()
            }
          })
        }
      } catch (error: any) {
        // Log error but don't fail event creation
        logger.error('Error sending meeting notification', error)
      }
    }

    // Return success message for pending events
    if (eventStatus === 'PENDING') {
      return NextResponse.json({
        ...event,
        message: 'Event request submitted. Waiting for admin approval.'
      }, { status: 201 })
    }

    return NextResponse.json(event, { status: 201 })
  } catch (error: any) {
    logger.error('Error creating event', error)
    const isDevelopment = process.env.NODE_ENV === 'development'
    const errorMessage = error?.message || String(error) || 'Failed to create event'
    logger.error('Event creation error details', {
      message: errorMessage,
      stack: error?.stack,
      code: error?.code,
      name: error?.name,
      cause: error?.cause
    })
    
    const errorResponse = { 
      error: 'Failed to create event',
      message: errorMessage
    }
    
    if (isDevelopment) {
      Object.assign(errorResponse, {
        details: errorMessage,
        stack: error?.stack,
        code: error?.code,
        name: error?.name
      })
    }
    
    return NextResponse.json(errorResponse, { status: 500 })
  }
}

export const GET = withRateLimit(handleGET)
export const POST = withRateLimit(handlePOST)

