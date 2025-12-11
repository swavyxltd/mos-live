import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { withRateLimit } from '@/lib/api-middleware'

async function handlePOST(request: NextRequest) {
  try {
    const body = await request.json()
    const { applicationId } = body

    if (!applicationId) {
      return NextResponse.json(
        { error: 'Application ID is required' },
        { status: 400 }
      )
    }

    // Find application
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        Org: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        },
        ApplicationChild: true
      }
    })

    if (!application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
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

    // Return application info
    return NextResponse.json({
      success: true,
      application: {
        id: application.id,
        guardianName: application.guardianName,
        guardianEmail: application.guardianEmail,
        children: application.ApplicationChild.map(child => ({
          firstName: child.firstName,
          lastName: child.lastName,
          dob: child.dob?.toISOString() || null
        }))
      },
      org: {
        id: application.Org.id,
        name: application.Org.name,
        slug: application.Org.slug
      },
      students: students.map(student => ({
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        classes: student.StudentClass.map(sc => ({
          id: sc.Class.id,
          name: sc.Class.name
        }))
      }))
    })
  } catch (error: any) {
    logger.error('Error fetching application', error)
    return NextResponse.json(
      { error: 'Failed to fetch application' },
      { status: 500 }
    )
  }
}

export const POST = withRateLimit(handlePOST, { strict: true })

