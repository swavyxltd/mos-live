import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { getOrgBySlug } from '@/lib/org'
import { logger } from '@/lib/logger'
import { sanitizeText, isValidEmail, isValidDateOfBirth, MAX_STRING_LENGTHS } from '@/lib/input-validation'
import { withRateLimit } from '@/lib/api-middleware'
import { validatePassword } from '@/lib/password-validation'
import { sendEmail } from '@/lib/mail'
import { generateEmailTemplate } from '@/lib/email-template'

async function handlePOST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, childFirstName, childLastName, childDob, studentId } = body

    // Validate required fields
    if (!email || !password || !childFirstName || !childLastName || !childDob) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    // If studentId is provided (from verification), use it directly
    // Otherwise, we need to find the student (less secure, but necessary for flow)
    let matchingStudent
    let org

    if (studentId) {
      // Use verified student ID
      matchingStudent = await prisma.student.findUnique({
        where: { id: studentId },
        include: {
          Org: true
        }
      })
      if (!matchingStudent) {
        return NextResponse.json(
          { error: 'Student not found' },
          { status: 404 }
        )
      }
      org = matchingStudent.Org
    } else {
      // Fallback: find student by details (less secure)
      // This should only happen if verification step was skipped
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

    // Validate password
    const passwordValidation = await validatePassword(password)
    if (!passwordValidation.isValid) {
      return NextResponse.json(
        { error: passwordValidation.errors.join('. ') },
        { status: 400 }
      )
    }

    // Validate child details (for verification, but we already have studentId)
    const sanitizedChildFirstName = sanitizeText(childFirstName.trim(), MAX_STRING_LENGTHS.name)
    const sanitizedChildLastName = sanitizeText(childLastName.trim(), MAX_STRING_LENGTHS.name)
    
    if (!isValidDateOfBirth(childDob)) {
      return NextResponse.json(
        { error: 'Invalid date of birth' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: sanitizedEmail }
    })

    if (existingUser) {
      // Check if user is already a parent in this org
      const existingMembership = await prisma.userOrgMembership.findUnique({
        where: {
          userId_orgId: {
            userId: existingUser.id,
            orgId: org.id
          }
        }
      })

      if (existingMembership && existingMembership.role === 'PARENT') {
        return NextResponse.json(
          { error: 'An account with this email already exists for this organisation. Please sign in instead.' },
          { status: 400 }
        )
      }
    }

    // Check if student already has a parent linked
    if (matchingStudent.primaryParentId) {
      const existingParent = await prisma.user.findUnique({
        where: { id: matchingStudent.primaryParentId }
      })
      if (existingParent) {
        return NextResponse.json(
          { error: 'This student already has a parent account linked. Please contact the madrasah if you need access.' },
          { status: 400 }
        )
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
      
      if (!parentUser) {
        parentUser = await tx.user.create({
          data: {
            id: crypto.randomUUID(),
            email: sanitizedEmail,
            password: hashedPassword,
            updatedAt: new Date()
          }
        })
      } else {
        // Update existing user with password if they don't have one
        if (!parentUser.password) {
          parentUser = await tx.user.update({
            where: { id: parentUser.id },
            data: {
              password: hashedPassword,
              updatedAt: new Date()
            }
          })
        }
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

      // Link student to parent
      await tx.student.update({
        where: { id: matchingStudent.id },
        data: {
          primaryParentId: parentUser.id
        }
      })

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
    return NextResponse.json(
      { error: error.message || 'Failed to create account' },
      { status: 500 }
    )
  }
}

export const POST = withRateLimit(handlePOST, { strict: true })

