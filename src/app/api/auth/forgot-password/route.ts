import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendPasswordResetEmail } from '@/lib/mail'
import { randomBytes } from 'crypto'
import { logger } from '@/lib/logger'
import { isValidEmail } from '@/lib/input-validation'
import { withRateLimit } from '@/lib/api-middleware'

async function handlePOST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    const sanitizedEmail = email.toLowerCase().trim()
    if (!isValidEmail(sanitizedEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: sanitizedEmail },
    })

    logger.info('Password reset request', {
      email: sanitizedEmail,
      userFound: !!user
    })

    // For security, always return success even if user doesn't exist
    // This prevents email enumeration attacks
    if (!user) {
      logger.warn('Password reset requested for non-existent user', { email: sanitizedEmail })
      return NextResponse.json({
        message: 'If an account exists with that email, a password reset link has been sent.',
      })
    }

    // Generate secure random token
    const token = randomBytes(32).toString('hex')
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 1) // 1 hour expiry

    // Delete any existing tokens for this user
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id },
    })

    // Create new reset token
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    })

    // Generate reset URL - use custom domain app.madrasah.io
    // Get base URL from environment or default to app.madrasah.io
    let baseUrl = process.env.APP_BASE_URL || process.env.NEXTAUTH_URL || 'https://app.madrasah.io'
    
    // Clean up the base URL - remove trailing slashes and whitespace
    baseUrl = baseUrl.trim().replace(/\/+$/, '')
    
    // Ensure it starts with http:// or https://
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      baseUrl = `https://${baseUrl}`
    }
    
    // Remove any duplicate protocol/domain patterns that might have been accidentally set
    // This prevents issues like: https://domain.com/https://domain.com
    baseUrl = baseUrl.replace(/^https?:\/\/([^\/]+)\/https?:\/\/([^\/]+)\/?/, 'https://$1')
    baseUrl = baseUrl.replace(/^(https?:\/\/[^\/]+)\/https?:\/\//, '$1')
    
    // Construct the reset URL
    const resetUrl = `${baseUrl}/auth/reset-password?token=${token}`
    
    logger.info('Generated password reset URL', {
      baseUrl,
      tokenLength: token.length
    })

    // Send password reset email
    try {
      const emailResult = await sendPasswordResetEmail({
        to: user.email,
        resetUrl,
      })
      logger.info('Password reset email sent', {
        to: user.email
      })
    } catch (emailError: any) {
      logger.error('Failed to send password reset email', emailError, {
        to: user.email
      })
      // Still return success to prevent email enumeration
    }

    return NextResponse.json({
      message: 'If an account exists with that email, a password reset link has been sent.',
    })
  } catch (error: any) {
    logger.error('Password reset request error', error)
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { 
        error: 'An error occurred. Please try again later.',
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}

export const POST = withRateLimit(handlePOST, { strict: true })

