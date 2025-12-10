export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { requireRole, requireOrg } from '@/lib/roles'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { withRateLimit } from '@/lib/api-middleware'

async function handleGET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireRole(['ADMIN', 'OWNER', 'STAFF'])(request)
    if (session instanceof NextResponse) return session

    const orgId = await requireOrg(request)
    if (orgId instanceof NextResponse) return orgId

    const classData = await prisma.class.findFirst({
      where: {
        id: params.id,
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
  { params }: { params: { id: string } }
) {
  let body: any = null
  try {
    const session = await requireRole(['ADMIN', 'OWNER'])(request)
    if (session instanceof NextResponse) return session

    const orgId = await requireOrg(request)
    if (orgId instanceof NextResponse) return orgId

    body = await request.json()
    const { name, description, schedule, teacherId, monthlyFeeP } = body

    // Verify class belongs to org
    const existingClass = await prisma.class.findFirst({
      where: {
        id: params.id,
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

    // Build update data object
    const updateData: any = {
      updatedAt: new Date()
    }

    if (name !== undefined) updateData.name = sanitizeText(name, MAX_STRING_LENGTHS.name)
    if (description !== undefined) updateData.description = description ? sanitizeText(description, MAX_STRING_LENGTHS.text) : null
    if (schedule !== undefined) {
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
    if (teacherId !== undefined) updateData.teacherId = teacherId || null
    if (monthlyFeeP !== undefined) {
      if (monthlyFeeP < 0) {
        return NextResponse.json(
          { error: 'Monthly fee must be non-negative' },
          { status: 400 }
        )
      }
      updateData.monthlyFeeP = Math.round(monthlyFeeP)
    }

    // Ensure we have at least one field to update besides updatedAt
    if (Object.keys(updateData).length === 1) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      )
    }

    // Update class
    const updatedClass = await prisma.class.update({
      where: { id: params.id },
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

    return NextResponse.json(updatedClass)
  } catch (error: any) {
    logger.error('Update class error', { 
      error: error?.message, 
      stack: error?.stack, 
      body,
      code: error?.code,
      meta: error?.meta
    })
    // Always return error details to help debug
    return NextResponse.json(
      { 
        error: 'Failed to update class',
        details: error?.message || 'Unknown error',
        ...(error?.code && { code: error?.code }),
        ...(error?.meta && { meta: error?.meta })
      },
      { status: 500 }
    )
  }
}

export const PATCH = withRateLimit(handlePATCH)

