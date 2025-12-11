import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { withRateLimit } from '@/lib/api-middleware'
import { sanitizeText } from '@/lib/input-validation'

async function handlePOST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, memorableWord } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    if (!memorableWord || typeof memorableWord !== 'string') {
      return NextResponse.json(
        { error: 'Memorable word is required' },
        { status: 400 }
      )
    }

    // Verify user exists and is a super admin
    let user
    try {
      user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
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

    if (!user.isSuperAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized - Only owner accounts require memorable word' },
        { status: 403 }
      )
    }

    // Check if memorable word exists
    const storedWord = (user as any).memorableWord
    if (!storedWord) {
      return NextResponse.json(
        { error: 'Memorable word not set. Please contact support.' },
        { status: 400 }
      )
    }

    // Sanitize and compare memorable word (case-insensitive)
    const sanitizedInput = sanitizeText(memorableWord.trim(), 50)
    const sanitizedStored = sanitizeText(storedWord, 50)

    if (sanitizedInput.toLowerCase() !== sanitizedStored.toLowerCase()) {
      logger.warn('Invalid memorable word attempt', { userId })
      return NextResponse.json(
        { error: 'Incorrect memorable word. Please try again.' },
        { status: 401 }
      )
    }

    logger.info('Memorable word verified', { userId })

    return NextResponse.json({
      success: true,
      message: 'Memorable word verified successfully'
    })
  } catch (error: any) {
    logger.error('Verify memorable word error', error)
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { 
        error: 'Failed to verify memorable word',
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}

export const POST = withRateLimit(handlePOST, { strict: true })

