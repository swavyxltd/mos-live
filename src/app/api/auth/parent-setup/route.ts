export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { logger } from '@/lib/logger'
import { sanitizeText, isValidPhone, MAX_STRING_LENGTHS } from '@/lib/input-validation'
import { withRateLimit } from '@/lib/api-middleware'

async function handlePOST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      token,
      password,
      parentName,
      parentPhone,
      emergencyContact,
      studentFirstName,
      studentLastName,
      studentDob,
      studentAllergies,
      studentMedicalNotes,
      paymentMethod
    } = body

    if (!token || !password || !parentName || !paymentMethod) {
      return NextResponse.json(
        { error: 'Missing required fields: token, password, parentName, paymentMethod' },
        { status: 400 }
      )
    }

    // Validate password length
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      )
    }

    // Sanitize and validate inputs
    const sanitizedParentName = sanitizeText(parentName, MAX_STRING_LENGTHS.name)
    const sanitizedParentPhone = parentPhone ? sanitizeText(parentPhone, MAX_STRING_LENGTHS.phone) : null
    const sanitizedStudentFirstName = studentFirstName ? sanitizeText(studentFirstName, MAX_STRING_LENGTHS.name) : null
    const sanitizedStudentLastName = studentLastName ? sanitizeText(studentLastName, MAX_STRING_LENGTHS.name) : null
    const sanitizedAllergies = studentAllergies ? sanitizeText(studentAllergies, MAX_STRING_LENGTHS.text) : null
    const sanitizedMedicalNotes = studentMedicalNotes ? sanitizeText(studentMedicalNotes, MAX_STRING_LENGTHS.text) : null

    // Validate phone if provided
    if (sanitizedParentPhone && !isValidPhone(sanitizedParentPhone)) {
      return NextResponse.json(
        { error: 'Invalid phone number format' },
        { status: 400 }
      )
    }

    // Validate date if provided
    let validatedDob: Date | null = null
    if (studentDob) {
      validatedDob = new Date(studentDob)
      if (isNaN(validatedDob.getTime())) {
        return NextResponse.json(
          { error: 'Invalid date of birth format' },
          { status: 400 }
        )
      }
    }

    // Validate invitation
    const invitation = await prisma.parentInvitation.findUnique({
      where: { token },
      include: {
        student: {
          include: {
            studentClasses: {
              include: {
                class: true
              }
            }
          }
        },
        org: true
      }
    })

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invalid invitation token' },
        { status: 404 }
      )
    }

    if (invitation.acceptedAt) {
      return NextResponse.json(
        { error: 'This invitation has already been used' },
        { status: 400 }
      )
    }

    if (new Date() > invitation.expiresAt) {
      return NextResponse.json(
        { error: 'This invitation has expired' },
        { status: 400 }
      )
    }

    // Validate payment method is allowed
    const allowedMethods = []
    if (invitation.org.cashPaymentEnabled) allowedMethods.push('CASH')
    if (invitation.org.bankTransferEnabled) allowedMethods.push('BANK_TRANSFER')
    if (invitation.org.stripeEnabled) allowedMethods.push('STRIPE')

    if (!allowedMethods.includes(paymentMethod)) {
      return NextResponse.json(
        { error: `Payment method ${paymentMethod} is not enabled for this organization` },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Use transaction for data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Find or create parent user
      let parentUser = await tx.user.findUnique({
        where: { email: invitation.parentEmail.toLowerCase() }
      })

      if (!parentUser) {
        parentUser = await tx.user.create({
          data: {
            email: invitation.parentEmail.toLowerCase(),
            name: sanitizedParentName,
            phone: sanitizedParentPhone,
            password: hashedPassword
          }
        })
      } else {
        // Update existing user
        parentUser = await tx.user.update({
          where: { id: parentUser.id },
          data: {
            name: sanitizedParentName,
            phone: sanitizedParentPhone,
            password: hashedPassword
          }
        })
      }

      // Ensure parent has membership in org
      const existingMembership = await tx.userOrgMembership.findUnique({
        where: {
          userId_orgId: {
            userId: parentUser.id,
            orgId: invitation.orgId
          }
        }
      })

      if (!existingMembership) {
        await tx.userOrgMembership.create({
          data: {
            userId: parentUser.id,
            orgId: invitation.orgId,
            role: 'PARENT'
          }
        })
      }

      // Link student to parent
      await tx.student.update({
        where: { id: invitation.studentId },
        data: {
          primaryParentId: parentUser.id,
          firstName: sanitizedStudentFirstName || invitation.student.firstName,
          lastName: sanitizedStudentLastName || invitation.student.lastName,
          dob: validatedDob || invitation.student.dob,
          allergies: sanitizedAllergies || invitation.student.allergies,
          medicalNotes: sanitizedMedicalNotes || invitation.student.medicalNotes
        }
      })

      // Create or update parent billing profile
      await tx.parentBillingProfile.upsert({
        where: {
          orgId_parentUserId: {
            orgId: invitation.orgId,
            parentUserId: parentUser.id
          }
        },
        create: {
          orgId: invitation.orgId,
          parentUserId: parentUser.id,
          preferredPaymentMethod: paymentMethod,
          autoPayEnabled: paymentMethod === 'STRIPE'
        },
        update: {
          preferredPaymentMethod: paymentMethod,
          autoPayEnabled: paymentMethod === 'STRIPE'
        }
      })

      // Update existing pending payment records for this student to use the parent's preferred method
      await tx.monthlyPaymentRecord.updateMany({
        where: {
          orgId: invitation.orgId,
          studentId: invitation.studentId,
          status: 'PENDING',
          method: null
        },
        data: {
          method: paymentMethod
        }
      })

      // Mark invitation as accepted
      await tx.parentInvitation.update({
        where: { id: invitation.id },
        data: {
          acceptedAt: new Date()
        }
      })

      return { parentUser }
    })

    // If Stripe is selected, return flag to route to Stripe setup
    const needsStripeSetup = paymentMethod === 'STRIPE'

    return NextResponse.json({
      success: true,
      userId: result.parentUser.id,
      email: result.parentUser.email,
      needsStripeSetup
    })
  } catch (error: any) {
    logger.error('Error completing parent setup', error)
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { 
        error: 'Failed to complete parent setup',
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}

export const POST = withRateLimit(handlePOST, { strict: true })

