import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateTwoFactorCode, sendTwoFactorCode, storeTwoFactorCode } from '@/lib/two-factor'
import { logger } from '@/lib/logger'
import { withRateLimit } from '@/lib/api-middleware'

async function handlePOST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        twoFactorEnabled: true
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    if (!user.twoFactorEnabled) {
      return NextResponse.json(
        { error: 'Two-factor authentication is not enabled for this account' },
        { status: 400 }
      )
    }

    // Generate and send new code
    const code = generateTwoFactorCode()
    await storeTwoFactorCode(user.id, code)
    
    try {
      await sendTwoFactorCode(user.email, code, user.name || undefined)
    } catch (emailError: any) {
      logger.error('Failed to send 2FA email', emailError)
      // Check if it's a demo mode issue
      if (emailError?.message?.includes('demo mode') || emailError?.message?.includes('disabled')) {
        return NextResponse.json(
          { 
            error: 'Email sending is not configured. Please check RESEND_API_KEY environment variable.',
            details: emailError.message
          },
          { status: 500 }
        )
      }
      throw emailError
    }

    return NextResponse.json({
      success: true,
      message: 'Verification code sent to your email'
    })
  } catch (error: any) {
    logger.error('Resend 2FA error', error)
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { 
        error: 'Failed to resend verification code',
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}

export const POST = withRateLimit(handlePOST, { strict: true })

