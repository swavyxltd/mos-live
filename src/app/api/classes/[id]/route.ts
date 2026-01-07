export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { requireRole, requireOrg } from '@/lib/roles'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { withRateLimit } from '@/lib/api-middleware'

async function handleGET(
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
    const classId = resolvedParams.id

    if (!classId) {
      return NextResponse.json(
        { error: 'Class ID is required' },
        { status: 400 }
      )
    }

    const classData = await prisma.class.findFirst({
      where: {
        id: classId,
        orgId: orgId
      },
      include: {
        User: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        StudentClass: {
          include: {
            Student: {
              select: {
                firstName: true,
                lastName: true,
                isArchived: true,
                createdAt: true
              }
            }
          },
          where: {
            Student: {
              isArchived: false
            }
          }
        },
        _count: {
          select: {
            StudentClass: {
              where: {
                Student: {
                  isArchived: false
                }
              }
            }
          }
        }
      }
    })

    if (!classData) {
      return NextResponse.json(
        { error: 'Class not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(classData)
  } catch (error: any) {
    logger.error('Get class error', error)
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { 
        error: 'Failed to fetch class',
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}

export const GET = withRateLimit(handleGET)

async function handlePATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  let body: any = null
  try {
    const session = await requireRole(['ADMIN', 'OWNER'])(request)
    if (session instanceof NextResponse) return session

    const orgId = await requireOrg(request)
    if (orgId instanceof NextResponse) return orgId

    // Resolve params if it's a Promise (Next.js 15+)
    const resolvedParams = await Promise.resolve(params)
    const classId = resolvedParams.id

    if (!classId) {
      return NextResponse.json(
        { error: 'Class ID is required' },
        { status: 400 }
      )
    }

    body = await request.json()
    const { name, description, schedule, teacherId, monthlyFeeP } = body

    // Verify class belongs to org
    const existingClass = await prisma.class.findFirst({
      where: {
        id: classId,
        orgId: orgId
      }
    })

    if (!existingClass) {
      return NextResponse.json(
        { error: 'Class not found' },
        { status: 404 }
      )
    }

    // Validation
    if (name !== undefined && (!name || name.trim().length === 0)) {
      return NextResponse.json(
        { error: 'Class name is required' },
        { status: 400 }
      )
    }

    // Sanitize inputs
    const { sanitizeText, MAX_STRING_LENGTHS } = await import('@/lib/input-validation')

    // Build update data object - only include fields that are explicitly provided
    const updateData: any = {
      updatedAt: new Date()
    }

    if (name !== undefined && name !== null) {
      const sanitizedName = sanitizeText(name, MAX_STRING_LENGTHS.name)
      if (sanitizedName.length > 0) {
        updateData.name = sanitizedName
      }
    }
    
    if (description !== undefined) {
      updateData.description = description ? sanitizeText(description, MAX_STRING_LENGTHS.text) : null
    }
    
    if (schedule !== undefined && schedule !== null) {
      // Schedule is a JSON string - validate it's valid JSON but don't sanitize
      // Sanitizing JSON strings can break the JSON structure
      try {
        // Validate JSON structure
        const parsed = JSON.parse(schedule)
        // Ensure it has the expected structure
        if (typeof parsed !== 'object' || parsed === null) {
          return NextResponse.json(
            { error: 'Invalid schedule format: must be an object' },
            { status: 400 }
          )
        }
        // Re-stringify to ensure it's valid and store as-is
        updateData.schedule = JSON.stringify(parsed)
      } catch (jsonError: any) {
        return NextResponse.json(
          { error: `Invalid schedule format: ${jsonError?.message || 'Invalid JSON'}` },
          { status: 400 }
        )
      }
    }
    
    if (teacherId !== undefined) {
      // Set teacherId - validate it exists in the database if provided
      if (teacherId && typeof teacherId === 'string' && teacherId.trim().length > 0) {
        const trimmedTeacherId = teacherId.trim()
        // Verify the teacher exists and belongs to the org
        const teacher = await prisma.user.findFirst({
          where: {
            id: trimmedTeacherId,
            UserOrgMembership: {
              some: {
                orgId: orgId,
                role: { in: ['ADMIN', 'STAFF'] }
              }
            }
          }
        })
        
        if (!teacher) {
          return NextResponse.json(
            { error: 'Teacher not found or does not belong to this organization' },
            { status: 400 }
          )
        }
        updateData.teacherId = trimmedTeacherId
      } else {
        updateData.teacherId = null
      }
    }
    
    if (monthlyFeeP !== undefined && monthlyFeeP !== null) {
      if (monthlyFeeP < 0) {
        return NextResponse.json(
          { error: 'Monthly fee must be non-negative' },
          { status: 400 }
        )
      }
      updateData.monthlyFeeP = Math.round(Number(monthlyFeeP))
    }

    // Ensure we have at least one field to update besides updatedAt
    if (Object.keys(updateData).length === 1) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      )
    }

    // Update class - id is unique so we only need that, but we've already verified orgId above
    const updatedClass = await prisma.class.update({
      where: { id: classId },
      data: updateData,
      include: {
        User: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        _count: {
          select: {
            StudentClass: true
          }
        }
      }
    })

    return NextResponse.json(updatedClass)
  } catch (error: any) {
    logger.error('Update class error', error, { body })
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { 
        error: 'Failed to update class',
        ...(isDevelopment && {
          details: error?.message,
          code: error?.code,
          meta: error?.meta
        })
      },
      { status: 500 }
    )
  }
}

export const PATCH = withRateLimit(handlePATCH)

