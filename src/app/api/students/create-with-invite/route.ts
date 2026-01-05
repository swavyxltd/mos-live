export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { requireRole, requireOrg } from '@/lib/roles'
import { prisma } from '@/lib/prisma'
import { sendParentOnboardingEmail, sendEmail } from '@/lib/mail'
import { generateEmailTemplate } from '@/lib/email-template'
import { checkPaymentMethod, checkBillingDay } from '@/lib/payment-check'
import { logger } from '@/lib/logger'
import { sanitizeText, isValidEmail, isValidEmailStrict, isValidName, isValidDateOfBirth, MAX_STRING_LENGTHS } from '@/lib/input-validation'
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

    // Check billing day
    const hasBillingDay = await checkBillingDay()
    if (!hasBillingDay) {
      return NextResponse.json(
        { error: 'Billing day required. Please set a billing day in Settings → Payment Methods before adding students.' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { firstName, lastName, dateOfBirth, parentEmail, classId, startMonth, status = 'ACTIVE' } = body

    // Validate required fields
    if (!firstName || !lastName || !dateOfBirth || !classId || !startMonth) {
      return NextResponse.json(
        { error: 'Missing required fields: firstName, lastName, dateOfBirth, classId, startMonth' },
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

    // Validate date of birth
    if (!isValidDateOfBirth(dateOfBirth)) {
      return NextResponse.json(
        { error: 'Date of birth must be a valid date (not in the future, age 0-120 years)' },
        { status: 400 }
      )
    }

    // Validate and sanitize email format if provided
    let sanitizedParentEmail: string | null = null
    if (parentEmail && parentEmail.trim()) {
      sanitizedParentEmail = parentEmail.toLowerCase().trim()
      if (!isValidEmailStrict(sanitizedParentEmail)) {
        return NextResponse.json(
          { error: 'Invalid email format' },
          { status: 400 }
        )
      }
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

    // Check if parent account already exists (before transaction)
    let existingParent = null
    if (sanitizedParentEmail) {
      existingParent = await prisma.user.findUnique({
        where: { email: sanitizedParentEmail },
        include: {
          UserOrgMembership: {
            where: { orgId }
          }
        }
      })
    }

    // Use transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Generate student ID
      const studentId = crypto.randomUUID()

      let parentUserId: string | null = null
      let isExistingParent = false

      // If parent account exists, link student immediately
      if (existingParent) {
        parentUserId = existingParent.id
        isExistingParent = true

        // Ensure parent has membership in this org
        await tx.userOrgMembership.upsert({
          where: {
            userId_orgId: {
              userId: parentUserId,
              orgId
            }
          },
          create: {
            id: crypto.randomUUID(),
            userId: parentUserId,
            orgId,
            role: 'PARENT'
          },
          update: {
            role: 'PARENT'
          }
        })
      }

      // Create student
      const student = await tx.student.create({
        data: {
          id: studentId,
          orgId,
          firstName: sanitizedFirstName,
          lastName: sanitizedLastName,
          dob: new Date(dateOfBirth),
          isArchived: status === 'ARCHIVED',
          claimStatus: isExistingParent ? 'CLAIMED' : 'NOT_CLAIMED',
          primaryParentId: parentUserId,
          claimedByParentId: parentUserId,
          updatedAt: new Date()
        }
      })

      // If parent exists, create ParentStudentLink immediately
      if (isExistingParent && parentUserId) {
        await tx.parentStudentLink.upsert({
          where: {
            parentId_studentId: {
              parentId: parentUserId,
              studentId: student.id
            }
          },
          create: {
            id: crypto.randomUUID(),
            orgId,
            parentId: parentUserId,
            studentId: student.id,
            claimedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
          },
          update: {
            updatedAt: new Date()
          }
        })
      }

      // Enroll student in class
      await tx.studentClass.create({
        data: {
          id: crypto.randomUUID(),
          orgId,
          studentId: student.id,
          classId
        }
      })

      // Create parent invitation only if email is provided AND parent doesn't exist
      let invitation = null
      let token: string | null = null
      if (sanitizedParentEmail && !isExistingParent) {
        token = crypto.randomBytes(32).toString('hex')
        const expiresAt = new Date()
        expiresAt.setDate(expiresAt.getDate() + 7) // 7 days expiry

        invitation = await tx.parentInvitation.create({
          data: {
            id: crypto.randomUUID(),
            orgId,
            studentId: student.id,
            parentEmail: sanitizedParentEmail,
            token,
            expiresAt
          }
        })
      }

      // Get parent's preferred payment method if parent exists
      let preferredMethod: string | null = null
      if (parentUserId) {
        const billingProfile = await tx.parentBillingProfile.findUnique({
          where: {
            orgId_parentUserId: {
              orgId,
              parentUserId: parentUserId
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

      return { student, invitation, token: token || null, isExistingParent, parentUserId }
    })

    // Send appropriate email based on whether parent exists
    if (sanitizedParentEmail) {
      const baseUrl = process.env.APP_BASE_URL || process.env.NEXTAUTH_URL || 'https://app.madrasah.io'
      const cleanBaseUrl = baseUrl.trim().replace(/\/+$/, '')

      try {
        if (result.isExistingParent) {
          // Parent already exists - send notification email
          const dashboardUrl = `${cleanBaseUrl}/parent/dashboard`
          const html = await generateEmailTemplate({
            title: 'New Student Added',
            description: `Assalamu'alaikum!<br><br>A new student has been added to your account at ${org.name}.`,
            details: [
              `<strong>Student Name:</strong> ${sanitizedFirstName} ${sanitizedLastName}`,
              `<strong>Class:</strong> ${classRecord.name}`
            ],
            buttonText: 'View Dashboard',
            buttonUrl: dashboardUrl,
            footerText: `You can now view and manage ${sanitizedFirstName}'s information, attendance, and payments from your parent dashboard.`
          })

          await sendEmail({
            to: sanitizedParentEmail,
            subject: `New Student Added - ${org.name}`,
            html,
            text: `A new student (${sanitizedFirstName} ${sanitizedLastName}) has been added to your account at ${org.name}. Visit ${dashboardUrl} to view your dashboard.`
          })
        } else if (result.token) {
          // New parent - send onboarding email
          const setupUrl = `${cleanBaseUrl}/auth/parent-setup?token=${result.token}`
          await sendParentOnboardingEmail({
            to: sanitizedParentEmail,
            orgName: org.name,
            studentName: `${sanitizedFirstName} ${sanitizedLastName}`,
            setupUrl
          })
        }
      } catch (emailError) {
        logger.error('Failed to send parent email', emailError)
        // Don't fail the request if email fails, but log it
      }
    }

    return NextResponse.json({
      success: true,
      student: {
        id: result.student.id,
        firstName: result.student.firstName,
        lastName: result.student.lastName
      },
      invitationSent: !!sanitizedParentEmail && !result.isExistingParent,
      linkedToExistingParent: result.isExistingParent || false
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

