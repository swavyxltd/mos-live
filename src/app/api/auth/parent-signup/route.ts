import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { getOrgBySlug } from '@/lib/org'
import { logger } from '@/lib/logger'
import { sanitizeText, isValidEmail, isValidDateOfBirth, isValidPhone, isValidUKPostcode, MAX_STRING_LENGTHS } from '@/lib/input-validation'
import { withRateLimit } from '@/lib/api-middleware'
import { validatePassword } from '@/lib/password-validation'
import { sendEmail } from '@/lib/mail'
import { generateEmailTemplate } from '@/lib/email-template'

async function handlePOST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      email, 
      password, 
      studentId, 
      applicationId,
      token, // Token from parent invitation
      // Parent details
      name,
      title,
      phone,
      backupPhone,
      address,
      city,
      postcode,
      relationshipToStudent,
      preferredPaymentMethod,
      giftAidStatus
    } = body

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    let matchingStudents: any[] = []
    let org
    let parentInvitation: any = null

    if (token) {
      // Token-based invitation flow - get student from invitation
      parentInvitation = await prisma.parentInvitation.findUnique({
        where: { token },
        include: {
          Student: {
            include: {
              Org: true
            }
          },
          Org: true
        }
      })

      if (!parentInvitation) {
        return NextResponse.json(
          { error: 'Invalid invitation token' },
          { status: 404 }
        )
      }

      if (parentInvitation.acceptedAt) {
        return NextResponse.json(
          { error: 'This invitation has already been used' },
          { status: 400 }
        )
      }

      if (new Date() > parentInvitation.expiresAt) {
        return NextResponse.json(
          { error: 'This invitation has expired' },
          { status: 400 }
        )
      }

      matchingStudents = [parentInvitation.Student]
      org = parentInvitation.Org
    } else if (applicationId) {
      // Application flow - get students from application
      const application = await prisma.application.findUnique({
        where: { id: applicationId },
        include: {
          Org: true,
          ApplicationChild: true
        }
      })

      if (!application || application.status !== 'ACCEPTED') {
        return NextResponse.json(
          { error: 'Application not found or not accepted' },
          { status: 404 }
        )
      }

      org = application.Org

      // Find students created from this application
      matchingStudents = await prisma.student.findMany({
        where: {
          orgId: org.id,
          firstName: { in: application.ApplicationChild.map(c => c.firstName) },
          lastName: { in: application.ApplicationChild.map(c => c.lastName) },
          isArchived: false
        }
      })

      if (matchingStudents.length === 0) {
        return NextResponse.json(
          { error: 'No students found for this application. Please contact the madrasah.' },
          { status: 404 }
        )
      }
    } else if (studentId) {
      // Normal flow - use verified student ID
      const student = await prisma.student.findUnique({
        where: { id: studentId },
        include: {
          Org: true
        }
      })
      
      if (!student) {
        return NextResponse.json(
          { error: 'Student not found' },
          { status: 404 }
        )
      }

      matchingStudents = [student]
      org = student.Org
    } else {
      return NextResponse.json(
        { error: 'Student verification required. Please verify your child first.' },
        { status: 400 }
      )
    }

    // Validate email
    const sanitizedEmail = email.toLowerCase().trim()
    if (!isValidEmail(sanitizedEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // If using token, validate email matches invitation
    if (parentInvitation && sanitizedEmail !== parentInvitation.parentEmail.toLowerCase().trim()) {
      return NextResponse.json(
        { error: 'Email does not match the invitation' },
        { status: 400 }
      )
    }

    // Validate password
    const passwordValidation = await validatePassword(password)
    if (!passwordValidation.isValid) {
      return NextResponse.json(
        { error: passwordValidation.errors.join('. ') },
        { status: 400 }
      )
    }

    // Check if user already exists - block ALL existing emails across entire app
    const existingUser = await prisma.user.findUnique({
      where: { email: sanitizedEmail },
      select: {
        id: true,
        isSuperAdmin: true
      }
    })

    if (existingUser) {
      // Email already exists - block signup completely
      // Same email cannot be used again across entire app for any account type
      return NextResponse.json(
        { error: 'This email address is already associated with an account. Please sign in with your existing account or use a different email address.' },
        { status: 400 }
      )
    }

    // Check if any student already has a parent linked
    for (const student of matchingStudents) {
      if (student.claimStatus === 'CLAIMED' && student.claimedByParentId) {
        const existingParent = await prisma.user.findUnique({
          where: { id: student.claimedByParentId }
        })
        if (existingParent) {
          return NextResponse.json(
            { error: 'One or more students already have a parent account linked. Please contact the madrasah if you need access.' },
            { status: 400 }
          )
        }
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days expiry

    // Create parent account and link to student in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create or update user
      let parentUser = existingUser
      
      // Sanitize and validate parent details
      const sanitizedName = name ? sanitizeText(name.trim(), MAX_STRING_LENGTHS.name) : null
      const sanitizedTitle = title ? sanitizeText(title.trim(), 10) : null
      const sanitizedPhone = phone ? phone.trim() : null
      const sanitizedBackupPhone = backupPhone ? backupPhone.trim() : null
      const sanitizedAddress = address ? sanitizeText(address.trim(), MAX_STRING_LENGTHS.address) : null
      const sanitizedCity = city ? sanitizeText(city.trim(), MAX_STRING_LENGTHS.city || 100) : null
      const sanitizedPostcode = postcode ? postcode.trim().toUpperCase() : null
      // Map ELIGIBLE to YES for gift aid status
      let sanitizedGiftAidStatus = giftAidStatus || 'NOT_DECLARED'
      if (sanitizedGiftAidStatus === 'ELIGIBLE') {
        sanitizedGiftAidStatus = 'YES'
      } else if (sanitizedGiftAidStatus === 'NOT_ELIGIBLE') {
        sanitizedGiftAidStatus = 'NO'
      }

      // Validate phone if provided
      if (sanitizedPhone && !isValidPhone(sanitizedPhone)) {
        return NextResponse.json(
          { error: 'Invalid phone number format' },
          { status: 400 }
        )
      }

      // Validate backup phone if provided
      if (sanitizedBackupPhone && !isValidPhone(sanitizedBackupPhone)) {
        return NextResponse.json(
          { error: 'Invalid backup phone number format' },
          { status: 400 }
        )
      }

      // Validate postcode - now required
      if (!sanitizedPostcode || !isValidUKPostcode(sanitizedPostcode)) {
        return NextResponse.json(
          { error: 'Valid UK postcode is required' },
          { status: 400 }
        )
      }

      // Validate address - now required
      if (!sanitizedAddress || sanitizedAddress.trim().length === 0) {
        return NextResponse.json(
          { error: 'Address is required' },
          { status: 400 }
        )
      }

      // Validate title - now required
      if (!sanitizedTitle || sanitizedTitle.trim().length === 0) {
        return NextResponse.json(
          { error: 'Title is required' },
          { status: 400 }
        )
      }

      // Validate payment method if provided
      if (preferredPaymentMethod && !['CARD', 'BANK_TRANSFER', 'CASH'].includes(preferredPaymentMethod)) {
        return NextResponse.json(
          { error: 'Invalid payment method' },
          { status: 400 }
        )
      }

      if (!parentUser) {
        parentUser = await tx.user.create({
          data: {
            id: crypto.randomUUID(),
            email: sanitizedEmail,
            password: hashedPassword,
            name: sanitizedName,
            title: sanitizedTitle,
            phone: sanitizedPhone,
            backupPhone: sanitizedBackupPhone,
            address: sanitizedAddress,
            city: sanitizedCity,
            postcode: sanitizedPostcode,
            giftAidStatus: sanitizedGiftAidStatus,
            updatedAt: new Date()
          }
        })
      } else {
        // Update existing user with password and details
        const updateData: any = {
          updatedAt: new Date()
        }
        
        if (!parentUser.password) {
          updateData.password = hashedPassword
        }
        
        if (sanitizedName) updateData.name = sanitizedName
        if (sanitizedTitle !== null) updateData.title = sanitizedTitle
        if (sanitizedPhone !== null) updateData.phone = sanitizedPhone
        if (sanitizedBackupPhone !== null) updateData.backupPhone = sanitizedBackupPhone
        if (sanitizedAddress !== null) updateData.address = sanitizedAddress
        if (sanitizedCity !== null) updateData.city = sanitizedCity
        if (sanitizedPostcode !== null) updateData.postcode = sanitizedPostcode
        if (sanitizedGiftAidStatus) updateData.giftAidStatus = sanitizedGiftAidStatus

        parentUser = await tx.user.update({
          where: { id: parentUser.id },
          data: updateData
        })
      }

      // Create or update UserOrgMembership
      await tx.userOrgMembership.upsert({
        where: {
          userId_orgId: {
            userId: parentUser.id,
            orgId: org.id
          }
        },
        create: {
          id: crypto.randomUUID(),
          userId: parentUser.id,
          orgId: org.id,
          role: 'PARENT'
        },
        update: {
          role: 'PARENT'
        }
      })

      // Link all students to parent and update claim status
      for (const student of matchingStudents) {
        // Update student claim status
        await tx.student.update({
          where: { id: student.id },
          data: {
            primaryParentId: parentUser.id,
            claimedByParentId: parentUser.id,
            claimStatus: 'PENDING_VERIFICATION'
          }
        })

        // Create ParentStudentLink
        await tx.parentStudentLink.upsert({
          where: {
            parentId_studentId: {
              parentId: parentUser.id,
              studentId: student.id
            }
          },
          create: {
            id: crypto.randomUUID(),
            orgId: org.id,
            parentId: parentUser.id,
            studentId: student.id,
            claimedAt: null, // Will be set after email verification
            createdAt: new Date(),
            updatedAt: new Date()
          },
          update: {
            updatedAt: new Date()
          }
        })
      }

      // Mark parent invitation as accepted if token was used
      if (parentInvitation) {
        await tx.parentInvitation.update({
          where: { id: parentInvitation.id },
          data: {
            acceptedAt: new Date()
          }
        })
      }

      // Create ParentBillingProfile if payment method is provided
      if (preferredPaymentMethod) {
        await tx.parentBillingProfile.upsert({
          where: {
            orgId_parentUserId: {
              orgId: org.id,
              parentUserId: parentUser.id
            }
          },
          create: {
            id: crypto.randomUUID(),
            orgId: org.id,
            parentUserId: parentUser.id,
            preferredPaymentMethod: preferredPaymentMethod,
            autoPayEnabled: preferredPaymentMethod === 'CARD',
            createdAt: new Date(),
            updatedAt: new Date()
          },
          update: {
            preferredPaymentMethod: preferredPaymentMethod,
            autoPayEnabled: preferredPaymentMethod === 'CARD',
            updatedAt: new Date()
          }
        })
      }

      // Store email verification token
      await tx.verificationToken.upsert({
        where: {
          identifier_token: {
            identifier: sanitizedEmail,
            token: verificationToken
          }
        },
        create: {
          identifier: sanitizedEmail,
          token: verificationToken,
          expires: expiresAt
        },
        update: {
          token: verificationToken,
          expires: expiresAt
        }
      })

      return { parentUser, verificationToken }
    })

    // Send verification email
    const baseUrl = process.env.APP_BASE_URL || process.env.NEXTAUTH_URL || 'https://app.madrasah.io'
    const cleanBaseUrl = baseUrl.trim().replace(/\/+$/, '')
    const verificationUrl = `${cleanBaseUrl}/auth/verify-email?token=${result.verificationToken}&email=${encodeURIComponent(sanitizedEmail)}`

    try {
      const html = await generateEmailTemplate({
        title: 'Verify Your Email Address',
        description: `Assalamu'alaikum!<br><br>Thank you for signing up for ${org.name}. Please verify your email address to complete your account setup.`,
        buttonText: 'Verify Email',
        buttonUrl: verificationUrl,
        footerText: 'This verification link will expire in 7 days. If you didn\'t create this account, please ignore this email.'
      })

      await sendEmail({
        to: sanitizedEmail,
        subject: `Verify Your Email - ${org.name}`,
        html,
        text: `Thank you for signing up for ${org.name}. Verify your email: ${verificationUrl}`
      })
    } catch (emailError: any) {
      logger.error('Failed to send verification email', emailError)
      // Don't fail the request if email fails, but log it
      // The user can request a new verification email later
    }

    return NextResponse.json({
      success: true,
      message: 'Account created. Please check your email to verify your account.'
    }, { status: 201 })
  } catch (error: any) {
    logger.error('Error in parent signup', error)
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { 
        error: 'Failed to create account',
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}

export const POST = withRateLimit(handlePOST, { strict: true })

