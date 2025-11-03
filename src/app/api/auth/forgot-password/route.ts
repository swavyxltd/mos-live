import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendPasswordResetEmail } from '@/lib/mail'
import { randomBytes } from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    })

    console.log('🔍 Password reset request:', {
      email: email.toLowerCase().trim(),
      userFound: !!user,
      userId: user?.id,
    })

    // For security, always return success even if user doesn't exist
    // This prevents email enumeration attacks
    if (!user) {
      console.log('⚠️  User not found - returning success without sending email')
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

    // Generate reset URL
    const baseUrl = process.env.APP_BASE_URL || process.env.NEXTAUTH_URL || 'https://madrasah-live.vercel.app'
    const resetUrl = `${baseUrl}/auth/reset-password?token=${token}`

    // Send password reset email
    try {
      const emailResult = await sendPasswordResetEmail({
        to: user.email,
        resetUrl,
      })
      console.log('✅ Password reset email sent:', {
        to: user.email,
        result: emailResult,
        resetUrl
      })
    } catch (emailError: any) {
      console.error('❌ Failed to send password reset email:', {
        error: emailError,
        message: emailError?.message,
        stack: emailError?.stack,
        to: user.email
      })
      // Still return success to prevent email enumeration
    }

    return NextResponse.json({
      message: 'If an account exists with that email, a password reset link has been sent.',
    })
  } catch (error) {
    console.error('Password reset request error:', error)
    return NextResponse.json(
      { error: 'An error occurred. Please try again later.' },
      { status: 500 }
    )
  }
}

