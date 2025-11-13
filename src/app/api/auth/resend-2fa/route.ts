import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateTwoFactorCode, sendTwoFactorCode, storeTwoFactorCode } from '@/lib/two-factor'

export async function POST(request: NextRequest) {
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
    await sendTwoFactorCode(user.email, code, user.name || undefined)

    return NextResponse.json({
      success: true,
      message: 'Verification code sent to your email'
    })
  } catch (error: any) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Resend 2FA error:', error)
    }
    return NextResponse.json(
      { error: 'Failed to resend verification code' },
      { status: 500 }
    )
  }
}

