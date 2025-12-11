import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { withRateLimit } from '@/lib/api-middleware'
import { requireRole, requireOrg } from '@/lib/roles'
import crypto from 'crypto'
import { sendEmail } from '@/lib/mail'
import { generateEmailTemplate } from '@/lib/email-template'
import { isValidEmail } from '@/lib/input-validation'

async function handlePOST(request: NextRequest) {
  try {
    const session = await requireRole(['ADMIN', 'OWNER'])(request)
    if (session instanceof NextResponse) return session

    const orgId = await requireOrg(request)
    if (orgId instanceof NextResponse) return orgId

    const body = await request.json()
    const { email } = body

    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { error: 'Valid email is required' },
        { status: 400 }
      )
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: {
        memberships: {
          where: { orgId },
          select: { role: true }
        }
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check if user is a parent in this org
    const parentMembership = user.memberships.find(m => m.role === 'PARENT')
    if (!parentMembership) {
      return NextResponse.json(
        { error: 'User is not a parent in this organisation' },
        { status: 400 }
      )
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days expiry

    // Store verification token
    await prisma.verificationToken.upsert({
      where: {
        identifier_token: {
          identifier: email.toLowerCase().trim(),
          token: verificationToken
        }
      },
      create: {
        identifier: email.toLowerCase().trim(),
        token: verificationToken,
        expires: expiresAt
      },
      update: {
        token: verificationToken,
        expires: expiresAt
      }
    })

    // Get org name
    const org = await prisma.org.findUnique({
      where: { id: orgId },
      select: { name: true }
    })

    // Send verification email
    const baseUrl = process.env.APP_BASE_URL || process.env.NEXTAUTH_URL || 'https://app.madrasah.io'
    const cleanBaseUrl = baseUrl.trim().replace(/\/+$/, '')
    const verificationUrl = `${cleanBaseUrl}/auth/verify-email?token=${verificationToken}&email=${encodeURIComponent(email.toLowerCase().trim())}`

    try {
      const html = await generateEmailTemplate({
        title: 'Verify Your Email Address',
        description: `Assalamu'alaikum!<br><br>Please verify your email address to complete your Parent Portal account setup for ${org?.name || 'the madrasah'}.`,
        buttonText: 'Verify Email',
        buttonUrl: verificationUrl,
        footerText: 'This verification link will expire in 7 days. If you didn\'t request this, please ignore this email.'
      })

      await sendEmail({
        to: email.toLowerCase().trim(),
        subject: `Verify Your Email - ${org?.name || 'Madrasah OS'}`,
        html,
        text: `Please verify your email address: ${verificationUrl}`
      })

      return NextResponse.json({
        success: true,
        message: 'Verification email sent successfully'
      })
    } catch (emailError: any) {
      logger.error('Failed to send verification email', emailError)
      return NextResponse.json(
        { error: 'Failed to send verification email' },
        { status: 500 }
      )
    }
  } catch (error: any) {
    logger.error('Error resending verification email', error)
    return NextResponse.json(
      { error: error.message || 'Failed to resend verification email' },
      { status: 500 }
    )
  }
}

export const POST = withRateLimit(handlePOST)

