import { NextRequest, NextResponse } from 'next/server'
import { requireRole, requireOrg } from '@/lib/roles'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { withRateLimit } from '@/lib/api-middleware'
import { generateClaimSheetPDF, generateMultipleClaimSheetsPDF } from '@/lib/claim-sheet-pdf'

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

    if (students.length === 0) {
      return NextResponse.json(
        { error: 'No students found matching the criteria' },
        { status: 404 }
      )
    }

    // Generate claim sheets data
    const baseUrl = process.env.APP_BASE_URL || process.env.NEXTAUTH_URL || 'https://app.madrasah.io'
    const cleanBaseUrl = baseUrl.trim().replace(/\/+$/, '')

    const sheets = students
      .filter(student => student.claimCode) // Only include students with claim codes
      .map(student => ({
        student: {
          id: student.id,
          firstName: student.firstName,
          lastName: student.lastName,
          claimCode: student.claimCode!
        },
        org: {
          name: student.Org.name
        },
        classes: student.StudentClass.map(sc => ({
          name: sc.Class.name
        })),
        signupUrl: `${cleanBaseUrl}/parent/signup?code=${student.claimCode}`
      }))

    if (sheets.length === 0) {
      return NextResponse.json(
        { error: 'No students with claim codes found. Please generate claim codes first.' },
        { status: 400 }
      )
    }

    // Generate PDF
    const pdfBuffer = sheets.length === 1
      ? await generateClaimSheetPDF(sheets[0])
      : await generateMultipleClaimSheetsPDF(sheets)

    // Return PDF
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="claim-sheets-${Date.now()}.pdf"`,
      },
    })
  } catch (error: any) {
    logger.error('Error generating claim sheets PDF', error)
    return NextResponse.json(
      { error: 'Failed to generate claim sheets PDF' },
      { status: 500 }
    )
  }
}

export const POST = withRateLimit(handlePOST)

