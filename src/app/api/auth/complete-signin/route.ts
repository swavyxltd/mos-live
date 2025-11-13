import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

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

    // Verify user exists and 2FA was completed (code should be cleared)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        twoFactorCode: true,
        twoFactorCodeExpiry: true,
        lastTwoFactorAt: true
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check if 2FA was completed recently (within last 5 minutes)
    // The twoFactorCode should be cleared after verification
    if (!user.lastTwoFactorAt) {
      return NextResponse.json(
        { error: 'Two-factor authentication not completed' },
        { status: 403 }
      )
    }

    const twoFactorCompletedRecently = 
      new Date(user.lastTwoFactorAt).getTime() > Date.now() - 5 * 60 * 1000

    if (!twoFactorCompletedRecently) {
      return NextResponse.json(
        { error: 'Two-factor authentication expired. Please verify again.' },
        { status: 403 }
      )
    }

    // 2FA is verified - return success
    // The frontend will use NextAuth's signIn with a special flow
    // We'll create a temporary session token that allows signin
    const { generateTwoFactorCode } = await import('@/lib/two-factor')
    const signinToken = generateTwoFactorCode() + generateTwoFactorCode() // 12 digit token
    
    // Store token with short expiry (2 minutes)
    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorCode: signinToken,
        twoFactorCodeExpiry: new Date(Date.now() + 2 * 60 * 1000)
      }
    })

    return NextResponse.json({
      success: true,
      signinToken,
      email: user.email
    })
  } catch (error: any) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Complete signin error:', error)
    }
    return NextResponse.json(
      { error: 'Failed to complete sign in' },
      { status: 500 }
    )
  }
}

