import { NextRequest, NextResponse } from 'next/server'
import { getOrgBySlug } from '@/lib/org'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { withRateLimit } from '@/lib/api-middleware'
import { sanitizeText, isValidDateOfBirth, MAX_STRING_LENGTHS } from '@/lib/input-validation'

async function handlePOST(request: NextRequest) {
  try {
    const body = await request.json()
    const { orgSlug, childFirstName, childLastName, childDob } = body

    if (!childFirstName || !childLastName || !childDob) {
      return NextResponse.json(
        { error: 'All child details are required' },
        { status: 400 }
      )
    }

    // Validate child details
    const sanitizedChildFirstName = sanitizeText(childFirstName.trim(), MAX_STRING_LENGTHS.name)
    const sanitizedChildLastName = sanitizeText(childLastName.trim(), MAX_STRING_LENGTHS.name)
    
    if (!isValidDateOfBirth(childDob)) {
      return NextResponse.json(
        { error: 'Invalid date of birth' },
        { status: 400 }
      )
    }

    // Prepare date range for DOB matching
    const childDobDate = new Date(childDob)
    const childDobStart = new Date(childDobDate)
    childDobStart.setHours(0, 0, 0, 0)
    const childDobEnd = new Date(childDobDate)
    childDobEnd.setHours(23, 59, 59, 999)

    // Build where clause
    let whereClause: any = {
      firstName: { equals: sanitizedChildFirstName, mode: 'insensitive' },
      lastName: { equals: sanitizedChildLastName, mode: 'insensitive' },
      dob: {
        gte: childDobStart,
        lte: childDobEnd
      },
      isArchived: false
    }

    // If orgSlug provided, scope to that org (more secure)
    if (orgSlug) {
      const org = await getOrgBySlug(orgSlug)
      if (!org) {
        return NextResponse.json(
          { error: 'Organisation not found' },
          { status: 404 }
        )
      }
      whereClause.orgId = org.id
    }
    // If no orgSlug, search across all orgs (less secure but necessary for flow)
    // This allows parents to sign up without knowing the org slug

    // Find matching student
    const matchingStudent = await prisma.student.findFirst({
      where: whereClause,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        dob: true,
        orgId: true
      }
    })

    if (!matchingStudent) {
      return NextResponse.json(
        { error: 'No matching student found. Please check the details you entered or contact the madrasah for assistance.' },
        { status: 404 }
      )
    }

    // Check if student already has a parent linked
    const studentWithParent = await prisma.student.findUnique({
      where: { id: matchingStudent.id },
      select: {
        id: true,
        primaryParentId: true
      }
    })

    if (studentWithParent?.primaryParentId) {
      const existingParent = await prisma.user.findUnique({
        where: { id: studentWithParent.primaryParentId },
        select: {
          email: true
        }
      })
      if (existingParent) {
        return NextResponse.json(
          { error: 'This student already has a parent account linked. Please contact the madrasah if you need access.' },
          { status: 400 }
        )
      }
    }

    // Return success with student info (but not sensitive data)
    return NextResponse.json({
      success: true,
      studentId: matchingStudent.id,
      studentName: `${matchingStudent.firstName} ${matchingStudent.lastName}`,
      orgId: matchingStudent.orgId
    })
  } catch (error: any) {
    logger.error('Error verifying student', error)
    return NextResponse.json(
      { error: 'Failed to verify student' },
      { status: 500 }
    )
  }
}

export const POST = withRateLimit(handlePOST, { strict: true })

