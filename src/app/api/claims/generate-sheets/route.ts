import { NextRequest, NextResponse } from 'next/server'
import { requireRole, requireOrg } from '@/lib/roles'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { withRateLimit } from '@/lib/api-middleware'

async function handlePOST(request: NextRequest) {
  try {
    const session = await requireRole(['ADMIN', 'OWNER'])(request)
    if (session instanceof NextResponse) return session

    const orgId = await requireOrg(request)
    if (orgId instanceof NextResponse) return orgId

    const body = await request.json()
    const { filter, classId, studentId } = body

    // Build where clause based on filter
    let whereClause: any = {
      orgId,
      isArchived: false
    }

    if (filter === 'not-claimed') {
      whereClause.claimStatus = 'NOT_CLAIMED'
    } else if (filter === 'pending') {
      whereClause.claimStatus = 'PENDING_VERIFICATION'
    } else if (filter === 'claimed') {
      whereClause.claimStatus = 'CLAIMED'
    }

    if (classId) {
      whereClause.StudentClass = {
        some: {
          classId
        }
      }
    }

    if (studentId) {
      whereClause.id = studentId
    }

    // Fetch students
    const students = await prisma.student.findMany({
      where: whereClause,
      include: {
        Org: {
          select: {
            id: true,
            name: true
          }
        },
        StudentClass: {
          include: {
            Class: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    })

    // Generate claim sheets data
    const baseUrl = process.env.APP_BASE_URL || process.env.NEXTAUTH_URL || 'https://app.madrasah.io'
    const cleanBaseUrl = baseUrl.trim().replace(/\/+$/, '')

    const sheets = students.map(student => ({
      student: {
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        claimCode: student.claimCode || 'N/A'
      },
      org: {
        name: student.Org.name
      },
      classes: student.StudentClass.map(sc => ({
        name: sc.Class.name
      })),
      signupUrl: student.claimCode 
        ? `${cleanBaseUrl}/parent/signup?code=${student.claimCode}`
        : null
    }))

    return NextResponse.json({
      success: true,
      sheets,
      count: sheets.length
    })
  } catch (error: any) {
    logger.error('Error generating claim sheets', error)
    return NextResponse.json(
      { error: 'Failed to generate claim sheets' },
      { status: 500 }
    )
  }
}

export const POST = withRateLimit(handlePOST)

