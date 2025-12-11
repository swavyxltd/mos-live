export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { requireRole, requireOrg } from '@/lib/roles'
import { prisma } from '@/lib/prisma'
import { sendParentOnboardingEmail } from '@/lib/mail'
import { checkPaymentMethod } from '@/lib/payment-check'
import { logger } from '@/lib/logger'
import { sanitizeText, isValidEmail, isValidEmailStrict, isValidName, MAX_STRING_LENGTHS } from '@/lib/input-validation'
import { withRateLimit } from '@/lib/api-middleware'
import crypto from 'crypto'

async function handlePOST(request: NextRequest) {
  try {
    const session = await requireRole(['ADMIN', 'OWNER'])(request)
    if (session instanceof NextResponse) return session

    const orgId = await requireOrg(request)
    if (orgId instanceof NextResponse) return orgId

    // Check payment method
    const hasPaymentMethod = await checkPaymentMethod()
    if (!hasPaymentMethod) {
      return NextResponse.json(
        { error: 'Payment method required. Please set up a payment method to add students.' },
        { status: 402 }
      )
    }

    const body = await request.json()
    const { firstName, lastName, parentEmail, classId, startMonth, status = 'ACTIVE' } = body

    // Validate required fields
    if (!firstName || !lastName || !parentEmail || !classId || !startMonth) {
      return NextResponse.json(
        { error: 'Missing required fields: firstName, lastName, parentEmail, classId, startMonth' },
        { status: 400 }
      )
    }

    // Validate first name
    if (!isValidName(firstName.trim())) {
      return NextResponse.json(
        { error: 'First name must be a valid name (2-50 characters, letters only)' },
        { status: 400 }
      )
    }

    // Validate last name
    if (!isValidName(lastName.trim())) {
      return NextResponse.json(
        { error: 'Last name must be a valid name (2-50 characters, letters only)' },
        { status: 400 }
      )
    }

    // Validate and sanitize email format
    const sanitizedParentEmail = parentEmail.toLowerCase().trim()
    if (!isValidEmailStrict(sanitizedParentEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }
    
    // Sanitize name fields
    const sanitizedFirstName = sanitizeText(firstName, MAX_STRING_LENGTHS.name)
    const sanitizedLastName = sanitizeText(lastName, MAX_STRING_LENGTHS.name)

    // Validate start month format (YYYY-MM)
    const monthRegex = /^\d{4}-\d{2}$/
    if (!monthRegex.test(startMonth)) {
      return NextResponse.json(
        { error: 'Invalid start month format. Use YYYY-MM (e.g., 2024-01)' },
        { status: 400 }
      )
    }

    // Get class and verify it belongs to org
    const classRecord = await prisma.class.findFirst({
      where: { id: classId, orgId, isArchived: false }
    })

    if (!classRecord) {
      return NextResponse.json(
        { error: 'Class not found' },
        { status: 404 }
      )
    }

    if (!classRecord.monthlyFeeP) {
      return NextResponse.json(
        { error: 'Class must have a monthly fee set' },
        { status: 400 }
      )
    }

    // Get org for email
    const org = await prisma.org.findUnique({
      where: { id: orgId },
      select: { name: true }
    })

    if (!org) {
      return NextResponse.json(
        { error: 'Organisation not found' },
        { status: 404 }
      )
    }

    // Use transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Generate student ID
      const studentId = crypto.randomUUID()

      // Create student
      const student = await tx.student.create({
        data: {
          id: studentId,
          orgId,
          firstName: sanitizedFirstName,
          lastName: sanitizedLastName,
          isArchived: status === 'ARCHIVED',
          claimStatus: 'NOT_CLAIMED',
          updatedAt: new Date()
        }
      })

      // Enroll student in class
      await tx.studentClass.create({
        data: {
          id: crypto.randomUUID(),
          orgId,
          studentId: student.id,
          classId
        }
      })

      // Create parent invitation
      const token = crypto.randomBytes(32).toString('hex')
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7) // 7 days expiry

      const invitation = await tx.parentInvitation.create({
        data: {
          id: crypto.randomUUID(),
          orgId,
          studentId: student.id,
          parentEmail: sanitizedParentEmail,
          token,
          expiresAt
        }
      })

      // Get parent's preferred payment method if parent exists
      let preferredMethod: string | null = null
      if (student.primaryParentId) {
        const billingProfile = await tx.parentBillingProfile.findUnique({
          where: {
            orgId_parentUserId: {
              orgId,
              parentUserId: student.primaryParentId
            }
          },
          select: { preferredPaymentMethod: true }
        })
        preferredMethod = billingProfile?.preferredPaymentMethod || null
      }

      // Create payment record for start month
      await tx.monthlyPaymentRecord.create({
        data: {
          id: crypto.randomUUID(),
          orgId,
          studentId: student.id,
          classId,
          month: startMonth,
          amountP: classRecord.monthlyFeeP,
          status: 'PENDING',
          method: preferredMethod,
          updatedAt: new Date()
        }
      })

      return { student, invitation, token }
    })

    // Send onboarding email
    const baseUrl = process.env.APP_BASE_URL || process.env.NEXTAUTH_URL || 'https://app.madrasah.io'
    const setupUrl = `${baseUrl.replace(/\/$/, '')}/auth/parent-setup?token=${result.token}`

    try {
      await sendParentOnboardingEmail({
        to: sanitizedParentEmail,
        orgName: org.name,
        studentName: `${sanitizedFirstName} ${sanitizedLastName}`,
        setupUrl
      })
    } catch (emailError) {
      logger.error('Failed to send parent onboarding email', emailError)
      // Don't fail the request if email fails, but log it
    }

    return NextResponse.json({
      success: true,
      student: {
        id: result.student.id,
        firstName: result.student.firstName,
        lastName: result.student.lastName
      },
      invitationSent: true
    }, { status: 201 })
  } catch (error: any) {
    logger.error('Error creating student with invite', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create student and send invitation' },
      { status: 500 }
    )
  }
}

export const POST = withRateLimit(handlePOST, { strict: true })

