export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { requireRole, requireOrg } from '@/lib/roles'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { withRateLimit } from '@/lib/api-middleware'
import crypto from 'crypto'

async function handlePOST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await requireRole(['ADMIN', 'OWNER', 'STAFF'])(request)
    if (session instanceof NextResponse) return session

    const orgId = await requireOrg(request)
    if (orgId instanceof NextResponse) return orgId

    // Resolve params if it's a Promise (Next.js 15+)
    const resolvedParams = params instanceof Promise ? await params : params
    const { id } = resolvedParams

    if (!id) {
      return NextResponse.json({ error: 'Student ID is required' }, { status: 400 })
    }

    const body = await request.json()
    const { body: noteBody } = body

    if (!noteBody || !noteBody.trim()) {
      return NextResponse.json({ error: 'Note body is required' }, { status: 400 })
    }

    // Verify student exists and belongs to org
    const student = await prisma.student.findFirst({
      where: {
        id,
        orgId
      }
    })

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    // Create progress log entry
    const note = await prisma.progressLog.create({
      data: {
        id: crypto.randomUUID(),
        orgId,
        studentId: id,
        body: noteBody.trim(),
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

    return NextResponse.json({
      id: note.id,
      body: note.body,
      createdAt: note.createdAt.toISOString(),
      author: note.User ? {
        id: note.User.id,
        name: note.User.name || '',
        email: note.User.email || ''
      } : null
    })
  } catch (error: any) {
    logger.error('Error creating student note', error)
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      {
        error: 'Failed to create note',
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}

export const POST = withRateLimit(handlePOST)

