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
    const { applicationToken, email, password } = body

    if (!applicationToken || !email || !password) {
      return NextResponse.json(
        { error: 'Application token, email, and password are required' },
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

    // Find application by acceptance token
    const application = await prisma.application.findUnique({
      where: { acceptanceToken: applicationToken },
      include: {
        Org: {
          select: {
            id: true,
            name: true
          }
        },
        ApplicationChild: true
      }
    })

    if (!application) {
      return NextResponse.json(
        { error: 'Invalid application token' },
        { status: 404 }
      )
    }

    // Check if token has expired
    if (application.acceptanceTokenExpiresAt && new Date() > application.acceptanceTokenExpiresAt) {
      return NextResponse.json(
        { error: 'This application token has expired. Please contact the madrasah for assistance.' },
        { status: 400 }
      )
    }

    // Check if token has already been used
    if (application.acceptanceTokenUsedAt) {
      return NextResponse.json(
        { error: 'This application token has already been used.' },
        { status: 400 }
      )
    }

    // Check if application is accepted
    if (application.status !== 'ACCEPTED') {
      return NextResponse.json(
        { error: 'This application has not been accepted yet.' },
        { status: 400 }
      )
    }

    // Find students created from this application
    const students = await prisma.student.findMany({
      where: {
        orgId: application.orgId,
        firstName: { in: application.ApplicationChild.map(c => c.firstName) },
        lastName: { in: application.ApplicationChild.map(c => c.lastName) }
      }
    })

    if (students.length === 0) {
      return NextResponse.json(
        { error: 'No students found for this application. Please contact the madrasah.' },
        { status: 404 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days expiry

    // Create parent account and link to students
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
              orgId: application.orgId
            }
          }
        })

        if (existingMembership && existingMembership.role === 'PARENT') {
          // User is already a parent, check if they already have links to these students
          const existingLinks = await tx.parentStudentLink.findMany({
            where: {
              parentId: parentUser.id,
              studentId: { in: students.map(s => s.id) }
            }
          })

          if (existingLinks.length > 0) {
            throw new Error('You already have access to one or more of these students.')
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
            name: application.guardianName.trim(),
            phone: application.guardianPhone?.trim() || null,
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
              name: application.guardianName.trim(),
              phone: application.guardianPhone?.trim() || null,
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
            orgId: application.orgId
          }
        },
        create: {
          id: crypto.randomUUID(),
          userId: parentUser.id,
          orgId: application.orgId,
          role: 'PARENT'
        },
        update: {
          role: 'PARENT'
        }
      })

      // Create ParentStudentLink for each student and mark as claimed
      for (const student of students) {
        await tx.parentStudentLink.upsert({
          where: {
            parentId_studentId: {
              parentId: parentUser.id,
              studentId: student.id
            }
          },
          create: {
            id: crypto.randomUUID(),
            orgId: application.orgId,
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
      }

      // Mark application token as used
      await tx.application.update({
        where: { id: application.id },
        data: {
          acceptanceTokenUsedAt: new Date()
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

      return { parentUser, verificationToken, students }
    })

    // Send verification email
    const baseUrl = process.env.APP_BASE_URL || process.env.NEXTAUTH_URL || 'https://app.madrasah.io'
    const cleanBaseUrl = baseUrl.trim().replace(/\/+$/, '')
    const verificationUrl = `${cleanBaseUrl}/auth/verify-email?token=${result.verificationToken}&email=${encodeURIComponent(sanitizedEmail)}`

    try {
      const html = await generateEmailTemplate({
        title: 'Verify Your Email Address',
        description: `Assalamu'alaikum!<br><br>Thank you for creating your Parent Portal account at ${application.Org.name}. Please verify your email address to complete the setup.`,
        buttonText: 'Verify Email',
        buttonUrl: verificationUrl,
        footerText: 'This verification link will expire in 7 days. If you didn\'t create this account, please ignore this email.'
      })

      await sendEmail({
        to: sanitizedEmail,
        subject: `Verify Your Email - ${application.Org.name}`,
        html,
        text: `Thank you for creating your Parent Portal account at ${application.Org.name}. Verify your email: ${verificationUrl}`
      })
    } catch (emailError: any) {
      logger.error('Failed to send verification email', emailError)
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      message: 'Account created. Please check your email to verify your account and complete the setup.'
    }, { status: 201 })
  } catch (error: any) {
    logger.error('Error claiming application', error)
    return NextResponse.json(
      { error: error.message || 'Failed to claim application' },
      { status: 500 }
    )
  }
}

export const POST = withRateLimit(handlePOST, { strict: true })

