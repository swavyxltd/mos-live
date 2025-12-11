import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { withRateLimit } from '@/lib/api-middleware'
import { sanitizeText, isValidDateOfBirth, MAX_STRING_LENGTHS } from '@/lib/input-validation'

async function handlePOST(request: NextRequest) {
  try {
    const body = await request.json()
    const { childFirstName, childLastName, childDob, orgSlug } = body

    if (!childFirstName || !childLastName || !childDob) {
      return NextResponse.json(
        { error: 'Child first name, last name, and date of birth are required' },
        { status: 400 }
      )
    }

    if (!isValidDateOfBirth(childDob)) {
      return NextResponse.json(
        { error: 'Invalid date of birth format' },
        { status: 400 }
      )
    }

    // Get organization
    let org
    if (orgSlug) {
      const { getOrgBySlug } = await import('@/lib/org')
      org = await getOrgBySlug(orgSlug)
      if (!org) {
        return NextResponse.json(
          { error: 'Organisation not found' },
          { status: 404 }
        )
      }
    } else {
      return NextResponse.json(
        { error: 'Organisation slug is required' },
        { status: 400 }
      )
    }

    // Sanitize and normalize inputs
    // Trim whitespace - names are stored as-is in DB, we match case-insensitively
    const trimmedFirstName = childFirstName.trim()
    const trimmedLastName = childLastName.trim()
    
    // Parse DOB - ensure it's a valid date
    const dobDate = new Date(childDob)
    if (isNaN(dobDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date of birth' },
        { status: 400 }
      )
    }
    
    // Create date range for DOB matching (covers entire day regardless of time component)
    // This ensures we match dates stored with any time component
    const dobStart = new Date(dobDate)
    dobStart.setHours(0, 0, 0, 0) // Start of day
    
    const dobEnd = new Date(dobDate)
    dobEnd.setHours(23, 59, 59, 999) // End of day

    // Find matching students:
    // - Case-insensitive name match (firstName and lastName)
    // - DOB within the day range (exact date match)
    // - Same org (orgId)
    // - Not archived
    // - Only allow claiming if NOT_CLAIMED or PENDING_VERIFICATION
    const matchingStudents = await prisma.student.findMany({
      where: {
        orgId: org.id,
        firstName: { equals: trimmedFirstName, mode: 'insensitive' },
        lastName: { equals: trimmedLastName, mode: 'insensitive' },
        dob: {
          gte: dobStart,
          lte: dobEnd
        },
        isArchived: false,
        // Only allow claiming if not already fully claimed
        OR: [
          { claimStatus: 'NOT_CLAIMED' },
          { claimStatus: 'PENDING_VERIFICATION' }
        ]
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
        },
        Org: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    if (matchingStudents.length === 0) {
      return NextResponse.json(
        { error: 'We couldn\'t find a student matching these details. Please contact the madrasah office.' },
        { status: 404 }
      )
    }

    // If multiple matches, return all for parent to choose
    if (matchingStudents.length > 1) {
      return NextResponse.json({
        success: true,
        multipleMatches: true,
        students: matchingStudents.map(s => ({
          id: s.id,
          firstName: s.firstName,
          lastName: s.lastName,
          dob: s.dob?.toISOString() || null,
          classes: s.StudentClass.map(sc => ({
            id: sc.Class.id,
            name: sc.Class.name
          })),
          claimStatus: s.claimStatus
        })),
        org: {
          id: org.id,
          name: org.name
        }
      })
    }

    // Single match
    const student = matchingStudents[0]

    // Check if already claimed
    if (student.claimStatus === 'CLAIMED' && student.claimedByParentId) {
      return NextResponse.json(
        { error: 'This student has already been claimed by a parent. Please contact the madrasah if you need access.' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      multipleMatches: false,
      student: {
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        dob: student.dob?.toISOString() || null,
        classes: student.StudentClass.map(sc => ({
          id: sc.Class.id,
          name: sc.Class.name
        })),
        claimStatus: student.claimStatus
      },
      org: {
        id: org.id,
        name: org.name
      }
    })
  } catch (error: any) {
    logger.error('Error verifying child', error)
    return NextResponse.json(
      { error: 'Failed to verify child' },
      { status: 500 }
    )
  }
}

export const POST = withRateLimit(handlePOST, { strict: true })

