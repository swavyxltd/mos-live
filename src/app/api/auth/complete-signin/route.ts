import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
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

    // Verify user exists and 2FA was completed (code should be cleared)
    // Note: memorableWord might not exist if migration hasn't run yet
    let user
    try {
      user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          twoFactorCode: true,
          twoFactorCodeExpiry: true,
          lastTwoFactorAt: true,
          isSuperAdmin: true,
          memorableWord: true
        }
      })
    } catch (dbError: any) {
      // If memorableWord column doesn't exist yet, query without it
      if (dbError?.message?.includes('memorableWord') || dbError?.code === 'P2021') {
        user = await prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            email: true,
            twoFactorCode: true,
            twoFactorCodeExpiry: true,
            lastTwoFactorAt: true,
            isSuperAdmin: true
          }
        })
        // Set memorableWord to null if column doesn't exist
        if (user) {
          (user as any).memorableWord = null
        }
      } else {
        throw dbError
      }
    }

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

    // For owner accounts, always require memorable word (either to set or verify)
    const hasMemorableWord = !!(user as any).memorableWord
    const needsMemorableWord = user.isSuperAdmin // Always require for owner accounts

    return NextResponse.json({
      success: true,
      signinToken,
      email: user.email,
      isSuperAdmin: user.isSuperAdmin,
      needsMemorableWord,
      hasMemorableWord // Indicates if word exists (for setting vs verifying)
    })
  } catch (error: any) {
    logger.error('Complete signin error', error)
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { 
        error: 'Failed to complete sign in',
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}

export const POST = withRateLimit(handlePOST, { strict: true })

