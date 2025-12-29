export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveOrg } from '@/lib/org'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { withRateLimit } from '@/lib/api-middleware'

// PUT /api/events/[id] - Update an event
async function handlePUT(
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

    // Resolve params if it's a Promise (Next.js 15+)
    const resolvedParams = params instanceof Promise ? await params : params
    const eventId = resolvedParams.id

    if (!eventId) {
      return NextResponse.json({ error: 'Event ID is required' }, { status: 400 })
    }

    // Verify event exists and belongs to org
    const existingEvent = await prisma.event.findFirst({
      where: {
        id: eventId,
        orgId: org.id
      }
    })

    if (!existingEvent) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    const body = await request.json()
    const { title, description, type, date, startTime, endTime, classId, studentId, allDay, endDate, location } = body

    // Validate required fields
    if (title !== undefined && (!title || !title.trim())) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }

    if (date !== undefined) {
      const eventDate = new Date(date)
      if (isNaN(eventDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid date format' },
          { status: 400 }
        )
      }
    }

    // Sanitize inputs
    const { sanitizeText, MAX_STRING_LENGTHS } = await import('@/lib/input-validation')

    // Build update data
    const updateData: any = {
      updatedAt: new Date()
    }

    if (title !== undefined) {
      updateData.title = sanitizeText(title, MAX_STRING_LENGTHS.name)
    }

    if (description !== undefined) {
      updateData.description = description ? sanitizeText(description, MAX_STRING_LENGTHS.text) : null
    }

    if (type !== undefined) {
      updateData.type = type
    }

    if (date !== undefined) {
      updateData.date = new Date(date)
    }

    if (endDate !== undefined) {
      updateData.endDate = endDate ? new Date(endDate) : null
    }

    if (startTime !== undefined) {
      updateData.startTime = allDay ? null : (startTime || null)
    }

    if (endTime !== undefined) {
      updateData.endTime = allDay ? null : (endTime || null)
    }

    if (location !== undefined) {
      updateData.location = location ? sanitizeText(location, MAX_STRING_LENGTHS.name) : null
    }

    if (classId !== undefined) {
      if (classId) {
        // Validate class exists
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
      updateData.classId = classId || null
    }

    if (studentId !== undefined) {
      if (studentId) {
        // Validate student exists
        const student = await prisma.student.findFirst({
          where: {
            id: studentId,
            orgId: org.id,
            isArchived: false
          }
        })
        if (!student) {
          return NextResponse.json(
            { error: 'Invalid student selected' },
            { status: 400 }
          )
        }
      }
      updateData.studentId = studentId || null
    }

    // Update event
    const updatedEvent = await prisma.event.update({
      where: { id: eventId },
      data: updateData,
      include: {
        Class: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    return NextResponse.json(updatedEvent)
  } catch (error: any) {
    logger.error('Error updating event', error)
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { 
        error: 'Failed to update event',
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}

// DELETE /api/events/[id] - Delete an event
async function handleDELETE(
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

    // Resolve params if it's a Promise (Next.js 15+)
    const resolvedParams = params instanceof Promise ? await params : params
    const eventId = resolvedParams.id

    if (!eventId) {
      return NextResponse.json({ error: 'Event ID is required' }, { status: 400 })
    }

    // Verify event exists and belongs to org
    const existingEvent = await prisma.event.findFirst({
      where: {
        id: eventId,
        orgId: org.id
      }
    })

    if (!existingEvent) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Delete event
    await prisma.event.delete({
      where: { id: eventId }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    logger.error('Error deleting event', error)
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { 
        error: 'Failed to delete event',
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}

export const PUT = withRateLimit(handlePUT)
export const DELETE = withRateLimit(handleDELETE)

