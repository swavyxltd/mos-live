import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { withRateLimit } from '@/lib/api-middleware'

async function handlePOST(request: NextRequest) {
  try {
    const body = await request.json()
    const { applicationToken } = body

    if (!applicationToken) {
      return NextResponse.json(
        { error: 'Application token is required' },
        { status: 400 }
      )
    }

    // Find application by acceptance token
    const application = await prisma.application.findUnique({
      where: { acceptanceToken: applicationToken },
      include: {
        Org: {
          select: {
            id: true,
            name: true
          }
        },
        ApplicationChild: true
      }
    })

    if (!application) {
      return NextResponse.json(
        { error: 'Invalid application token' },
        { status: 404 }
      )
    }

    // Check if token has expired
    if (application.acceptanceTokenExpiresAt && new Date() > application.acceptanceTokenExpiresAt) {
      return NextResponse.json(
        { error: 'This application token has expired. Please contact the madrasah for assistance.' },
        { status: 400 }
      )
    }

    // Check if token has already been used
    if (application.acceptanceTokenUsedAt) {
      return NextResponse.json(
        { error: 'This application token has already been used.' },
        { status: 400 }
      )
    }

    // Check if application is accepted
    if (application.status !== 'ACCEPTED') {
      return NextResponse.json(
        { error: 'This application has not been accepted yet.' },
        { status: 400 }
      )
    }

    // Find students created from this application
    const students = await prisma.student.findMany({
      where: {
        orgId: application.orgId,
        firstName: { in: application.ApplicationChild.map(c => c.firstName) },
        lastName: { in: application.ApplicationChild.map(c => c.lastName) }
      },
      include: {
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

    // Return application info (safe data only)
    return NextResponse.json({
      success: true,
      application: {
        id: application.id,
        guardianName: application.guardianName,
        guardianEmail: application.guardianEmail,
        children: application.ApplicationChild.map(child => ({
          firstName: child.firstName,
          lastName: child.lastName,
          dob: child.dob
        }))
      },
      org: {
        id: application.Org.id,
        name: application.Org.name
      },
      students: students.map(student => ({
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        claimCode: student.claimCode,
        classes: student.StudentClass.map(sc => ({
          id: sc.Class.id,
          name: sc.Class.name
        }))
      }))
    })
  } catch (error: any) {
    logger.error('Error validating application token', error)
    return NextResponse.json(
      { error: 'Failed to validate application token' },
      { status: 500 }
    )
  }
}

export const POST = withRateLimit(handlePOST, { strict: true })

