import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { checkEmailRateLimit } from '@/lib/rate-limit'
import { generateTwoFactorCode, sendTwoFactorCode, storeTwoFactorCode, isTwoFactorEnabled } from '@/lib/two-factor'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, twoFactorCode, pendingUserId } = body

    // If 2FA code is provided, this is the verification step
    if (twoFactorCode && pendingUserId) {
      const { verifyTwoFactorCode } = await import('@/lib/two-factor')
      const isValid = await verifyTwoFactorCode(pendingUserId, twoFactorCode)
      
      if (!isValid) {
        return NextResponse.json(
          { error: 'Invalid or expired verification code', requiresTwoFactor: true },
          { status: 400 }
        )
      }

      // Code is valid - return success so frontend can complete NextAuth signin
      return NextResponse.json({
        success: true,
        userId: pendingUserId,
        twoFactorVerified: true
      })
    }

    // Initial password verification step
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Check rate limit
    const emailRateLimit = checkEmailRateLimit(email)
    if (!emailRateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        { status: 429 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    })

    if (!user) {
      // Don't reveal if user exists
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      return NextResponse.json(
        { error: 'Account is temporarily locked. Please try again later.' },
        { status: 403 }
      )
    }

    // Require password
    if (!user.password) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password)
    
    if (!isValidPassword) {
      // Increment failed login attempts
      const newFailedAttempts = (user.failedLoginAttempts || 0) + 1
      const lockoutDuration = 30 * 60 * 1000 // 30 minutes
      const shouldLockAccount = newFailedAttempts >= 5

      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: newFailedAttempts,
          lastFailedLoginAttempt: new Date(),
          ...(shouldLockAccount && {
            lockedUntil: new Date(Date.now() + lockoutDuration)
          })
        }
      })

      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Password is valid - reset failed attempts
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastFailedLoginAttempt: null
      }
    })

    // Check if 2FA is enabled (default to true for security)
    const needsTwoFactor = user.twoFactorEnabled !== false // Default to enabled

    if (needsTwoFactor) {
      // Generate and send 2FA code
      const code = generateTwoFactorCode()
      await storeTwoFactorCode(user.id, code)
      await sendTwoFactorCode(user.email, code, user.name || undefined)

      return NextResponse.json({
        requiresTwoFactor: true,
        pendingUserId: user.id,
        message: 'Verification code sent to your email'
      })
    }

    // No 2FA needed (explicitly disabled) - return success
    // Note: This should rarely happen as 2FA is enabled by default
    return NextResponse.json({
      success: true,
      userId: user.id,
      requiresTwoFactor: false
    })
  } catch (error: any) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Signin error:', error)
    }
    return NextResponse.json(
      { error: 'An error occurred during sign in' },
      { status: 500 }
    )
  }
}

