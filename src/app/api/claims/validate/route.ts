import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { withRateLimit } from '@/lib/api-middleware'

async function handlePOST(request: NextRequest) {
  try {
    const body = await request.json()
    const { claimCode, orgId } = body

    if (!claimCode) {
      return NextResponse.json(
        { error: 'Claim code is required' },
        { status: 400 }
      )
    }

    // Find student by claim code
    const student = await prisma.student.findUnique({
      where: { claimCode },
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

    if (!student) {
      return NextResponse.json(
        { error: 'Invalid claim code. Please check the code and try again.' },
        { status: 404 }
      )
    }

    // If orgId provided, verify it matches
    if (orgId && student.orgId !== orgId) {
      return NextResponse.json(
        { error: 'Invalid claim code for this organisation.' },
        { status: 403 }
      )
    }

    // Check if claim code has expired
    if (student.claimCodeExpiresAt && new Date() > student.claimCodeExpiresAt) {
      return NextResponse.json(
        { error: 'This claim code has expired. Please contact the madrasah for a new code.' },
        { status: 400 }
      )
    }

    // Check claim status
    if (student.claimStatus === 'CLAIMED') {
      return NextResponse.json(
        { error: 'This student has already been claimed by a parent.' },
        { status: 400 }
      )
    }

    // Return student info (safe data only)
    return NextResponse.json({
      success: true,
      student: {
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        dob: student.dob,
        claimStatus: student.claimStatus
      },
      org: {
        id: student.Org.id,
        name: student.Org.name
      },
      classes: student.StudentClass.map(sc => ({
        id: sc.Class.id,
        name: sc.Class.name
      }))
    })
  } catch (error: any) {
    logger.error('Error validating claim code', error)
    return NextResponse.json(
      { error: 'Failed to validate claim code' },
      { status: 500 }
    )
  }
}

export const POST = withRateLimit(handlePOST, { strict: true })

