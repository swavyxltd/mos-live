export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { logger } from '@/lib/logger'
import { sanitizeText, isValidPhone, isValidUKPostcode, MAX_STRING_LENGTHS } from '@/lib/input-validation'
import { withRateLimit } from '@/lib/api-middleware'
import { createSetupIntent, ensureParentCustomer } from '@/lib/stripe'
import { validatePassword } from '@/lib/password-validation'

async function handlePOST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      token,
      password,
      parentTitle,
      parentName,
      parentPhone,
      emergencyContact,
      studentFirstName,
      studentLastName,
      studentDob,
      studentAllergies,
      studentMedicalNotes,
      paymentMethod,
      parentAddress,
      parentPostcode,
      giftAidStatus
    } = body

    if (!token || !password || !parentName || !parentPhone || !paymentMethod || !giftAidStatus) {
      return NextResponse.json(
        { error: 'Missing required fields: token, password, parentName, parentPhone, paymentMethod, giftAidStatus' },
        { status: 400 }
      )
    }

    if (giftAidStatus === 'YES' && (!parentAddress || !parentPostcode)) {
      return NextResponse.json(
        { error: 'Address and postcode are required when selecting Gift Aid' },
        { status: 400 }
      )
    }

    // Validate password against platform settings
    const passwordValidation = await validatePassword(password)
    if (!passwordValidation.isValid) {
      return NextResponse.json(
        { error: passwordValidation.errors.join('. ') },
        { status: 400 }
      )
    }

    // Sanitize and validate inputs
    const sanitizedParentTitle = parentTitle ? sanitizeText(parentTitle, 10) : null // Max 10 chars for title (Mr, Mrs, etc.)
    const sanitizedParentName = sanitizeText(parentName, MAX_STRING_LENGTHS.name)
    const sanitizedParentPhone = sanitizeText(parentPhone, MAX_STRING_LENGTHS.phone)
    const sanitizedStudentFirstName = studentFirstName ? sanitizeText(studentFirstName, MAX_STRING_LENGTHS.name) : null
    const sanitizedStudentLastName = studentLastName ? sanitizeText(studentLastName, MAX_STRING_LENGTHS.name) : null
    const sanitizedAllergies = studentAllergies ? sanitizeText(studentAllergies, MAX_STRING_LENGTHS.text) : null
    const sanitizedMedicalNotes = studentMedicalNotes ? sanitizeText(studentMedicalNotes, MAX_STRING_LENGTHS.text) : null

    // Validate phone (required) - UK format only
    if (!isValidPhone(sanitizedParentPhone)) {
      return NextResponse.json(
        { error: 'Invalid phone number format. Please enter a valid UK phone number (e.g., +44 7700 900123 or 07700 900123)' },
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
        Student: {
          include: {
            StudentClass: {
              include: {
                Class: true
              }
            }
          }
        },
        Org: true
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
    if (invitation.Org.acceptsCash ?? invitation.Org.cashPaymentEnabled ?? true) allowedMethods.push('CASH')
    if (invitation.Org.acceptsBankTransfer ?? invitation.Org.bankTransferEnabled ?? true) allowedMethods.push('BANK_TRANSFER')
    if (invitation.Org.acceptsCard && invitation.Org.stripeConnectAccountId) allowedMethods.push('CARD')
    if (invitation.Org.stripeEnabled) allowedMethods.push('STRIPE')

    if (!allowedMethods.includes(paymentMethod)) {
      return NextResponse.json(
        { error: `Payment method ${paymentMethod} is not enabled for this organisation` },
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

      // Sanitize Gift Aid fields
      const sanitizedAddress = parentAddress ? sanitizeText(parentAddress, MAX_STRING_LENGTHS.text) : null
      let sanitizedPostcode: string | null = null
      if (parentPostcode) {
        const cleanedPostcode = parentPostcode.toUpperCase().trim()
        if (!isValidUKPostcode(cleanedPostcode)) {
          return NextResponse.json(
            { error: 'Invalid postcode format. Please enter a valid UK postcode (e.g., SW1A 1AA)' },
            { status: 400 }
          )
        }
        sanitizedPostcode = sanitizeText(cleanedPostcode, 10)
      }

      if (!parentUser) {
        try {
          parentUser = await tx.user.create({
            data: {
              id: crypto.randomUUID(),
              email: invitation.parentEmail.toLowerCase(),
              name: sanitizedParentName,
              phone: sanitizedParentPhone,
              password: hashedPassword,
              title: sanitizedParentTitle,
              address: sanitizedAddress,
              postcode: sanitizedPostcode,
              giftAidStatus: giftAidStatus,
              giftAidDeclaredAt: new Date(),
              updatedAt: new Date()
            }
          })
        } catch (createError: any) {
          // Handle unique constraint violation (race condition)
          if (createError.code === 'P2002') {
            // User was created between our check and create, fetch and update it
            parentUser = await tx.user.findUnique({
              where: { email: invitation.parentEmail.toLowerCase() }
            })
            if (!parentUser) {
              throw new Error('This email is already being used. Please use a different one.')
            }
            // Update the existing user
            parentUser = await tx.user.update({
              where: { id: parentUser.id },
              data: {
                name: sanitizedParentName,
                phone: sanitizedParentPhone,
                password: hashedPassword,
                title: sanitizedParentTitle,
                address: sanitizedAddress,
                postcode: sanitizedPostcode,
                giftAidStatus: giftAidStatus,
                giftAidDeclaredAt: new Date()
              }
            })
          } else {
            throw createError
          }
        }
      } else {
        // Update existing user
        parentUser = await tx.user.update({
          where: { id: parentUser.id },
          data: {
            name: sanitizedParentName,
            phone: sanitizedParentPhone,
            password: hashedPassword,
            title: sanitizedParentTitle,
            address: sanitizedAddress,
            postcode: sanitizedPostcode,
            giftAidStatus: giftAidStatus,
            giftAidDeclaredAt: new Date()
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
            id: crypto.randomUUID(),
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
          firstName: sanitizedStudentFirstName || invitation.Student.firstName,
          lastName: sanitizedStudentLastName || invitation.Student.lastName,
          dob: validatedDob || invitation.Student.dob,
          allergies: sanitizedAllergies || invitation.Student.allergies,
          medicalNotes: sanitizedMedicalNotes || invitation.Student.medicalNotes,
          paymentMethod: paymentMethod
        }
      })

      // Create or update parent billing profile
      const isCardPayment = paymentMethod === 'CARD'
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
          autoPayEnabled: isCardPayment
        },
        update: {
          preferredPaymentMethod: paymentMethod,
          autoPayEnabled: isCardPayment
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

    // If CARD is selected, create SetupIntent for card setup
    let setupIntentClientSecret: string | null = null
    if (paymentMethod === 'CARD') {
      try {
        const setupIntent = await createSetupIntent(invitation.orgId, result.parentUser.id)
        setupIntentClientSecret = setupIntent.client_secret
      } catch (error: any) {
        logger.error('Error creating SetupIntent', error)
        // Continue anyway - parent can set up card later
      }
    }

    return NextResponse.json({
      success: true,
      userId: result.parentUser.id,
      email: result.parentUser.email,
      needsCardSetup: paymentMethod === 'CARD',
      setupIntentClientSecret
    })
  } catch (error: any) {
    logger.error('Error completing parent setup', error)
    
    // Handle unique constraint violation
    if (error.code === 'P2002' || error.message?.includes('already being used')) {
      return NextResponse.json(
        { error: 'This email is already being used. Please use a different one.' },
        { status: 400 }
      )
    }
    
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

