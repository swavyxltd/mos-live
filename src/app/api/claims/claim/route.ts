import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { withRateLimit } from '@/lib/api-middleware'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { isValidEmail } from '@/lib/input-validation'
import { validatePassword } from '@/lib/password-validation'
import { sendEmail } from '@/lib/mail'
import { generateEmailTemplate } from '@/lib/email-template'

async function handlePOST(request: NextRequest) {
  try {
    const body = await request.json()
    const { claimCode, email, password } = body

    if (!claimCode || !email || !password) {
      return NextResponse.json(
        { error: 'Claim code, email, and password are required' },
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

    // Find student by claim code
    const student = await prisma.student.findUnique({
      where: { claimCode },
      include: {
        Org: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    if (!student) {
      return NextResponse.json(
        { error: 'Invalid claim code' },
        { status: 404 }
      )
    }

    // Check if claim code has expired
    if (student.claimCodeExpiresAt && new Date() > student.claimCodeExpiresAt) {
      return NextResponse.json(
        { error: 'This claim code has expired. Please contact the madrasah for a new code.' },
        { status: 400 }
      )
    }

    // Check if already claimed
    if (student.claimStatus === 'CLAIMED') {
      return NextResponse.json(
        { error: 'This student has already been claimed by a parent.' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days expiry

    // Create or update parent account and link to student
    const result = await prisma.$transaction(async (tx) => {
      // Check if user already exists
      let parentUser = await tx.user.findUnique({
        where: { email: sanitizedEmail }
      })

      if (parentUser) {
        // Check if user is already a parent in this org
        const existingMembership = await tx.userOrgMembership.findUnique({
          where: {
            userId_orgId: {
              userId: parentUser.id,
              orgId: student.orgId
            }
          }
        })

        if (existingMembership && existingMembership.role === 'PARENT') {
          // User is already a parent in this org, check if they already have a link to this student
          const existingLink = await tx.parentStudentLink.findUnique({
            where: {
              parentId_studentId: {
                parentId: parentUser.id,
                studentId: student.id
              }
            }
          })

          if (existingLink) {
            throw new Error('You already have access to this student.')
          }
        }
      }

      // Create or update user
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
            orgId: student.orgId
          }
        },
        create: {
          id: crypto.randomUUID(),
          userId: parentUser.id,
          orgId: student.orgId,
          role: 'PARENT'
        },
        update: {
          role: 'PARENT'
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
          orgId: student.orgId,
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

      // Update student claim status to PENDING_VERIFICATION
      await tx.student.update({
        where: { id: student.id },
        data: {
          claimStatus: 'PENDING_VERIFICATION',
          claimedByParentId: parentUser.id
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

      return { parentUser, verificationToken, student }
    })

    // Send verification email
    const baseUrl = process.env.APP_BASE_URL || process.env.NEXTAUTH_URL || 'https://app.madrasah.io'
    const cleanBaseUrl = baseUrl.trim().replace(/\/+$/, '')
    const verificationUrl = `${cleanBaseUrl}/auth/verify-email?token=${result.verificationToken}&email=${encodeURIComponent(sanitizedEmail)}`

    try {
      const html = await generateEmailTemplate({
        title: 'Verify Your Email Address',
        description: `Assalamu'alaikum!<br><br>Thank you for claiming your child's account at ${result.student.Org.name}. Please verify your email address to complete the claim process.`,
        buttonText: 'Verify Email',
        buttonUrl: verificationUrl,
        footerText: 'This verification link will expire in 7 days. If you didn\'t create this account, please ignore this email.'
      })

      await sendEmail({
        to: sanitizedEmail,
        subject: `Verify Your Email - ${result.student.Org.name}`,
        html,
        text: `Thank you for claiming your child's account at ${result.student.Org.name}. Verify your email: ${verificationUrl}`
      })
    } catch (emailError: any) {
      logger.error('Failed to send verification email', emailError)
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      message: 'Account created. Please check your email to verify your account and complete the claim process.'
    }, { status: 201 })
  } catch (error: any) {
    logger.error('Error claiming student', error)
    return NextResponse.json(
      { error: error.message || 'Failed to claim student' },
      { status: 500 }
    )
  }
}

export const POST = withRateLimit(handlePOST, { strict: true })

