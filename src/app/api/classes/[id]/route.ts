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
  try {
    const session = await requireRole(['ADMIN', 'OWNER'])(request)
    if (session instanceof NextResponse) return session

    const orgId = await requireOrg(request)
    if (orgId instanceof NextResponse) return orgId

    const body = await request.json()
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

    // Build update data object
    const updateData: any = {
      updatedAt: new Date()
    }

    if (name !== undefined) updateData.name = name.trim()
    if (description !== undefined) updateData.description = description?.trim() || null
    if (schedule !== undefined) updateData.schedule = schedule
    if (teacherId !== undefined) updateData.teacherId = teacherId || null
    if (monthlyFeeP !== undefined) updateData.monthlyFeeP = Math.round(monthlyFeeP)

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
    logger.error('Update class error', error)
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { 
        error: 'Failed to update class',
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}

export const PATCH = withRateLimit(handlePATCH)

