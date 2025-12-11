import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { withRateLimit } from '@/lib/api-middleware'
import { sanitizeText, MAX_STRING_LENGTHS } from '@/lib/input-validation'

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

    // Validate memorable word
    const trimmedWord = memorableWord.trim()
    if (trimmedWord.length < 3) {
      return NextResponse.json(
        { error: 'Memorable word must be at least 3 characters' },
        { status: 400 }
      )
    }

    if (trimmedWord.length > 50) {
      return NextResponse.json(
        { error: 'Memorable word must be less than 50 characters' },
        { status: 400 }
      )
    }

    // Verify user exists and is a super admin
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        isSuperAdmin: true
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    if (!user.isSuperAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized - Only owner accounts can set memorable word' },
        { status: 403 }
      )
    }

    // Sanitize and save memorable word
    const sanitizedWord = sanitizeText(trimmedWord, MAX_STRING_LENGTHS.text || 50)

    await prisma.user.update({
      where: { id: userId },
      data: {
        memorableWord: sanitizedWord
      }
    })

    logger.info('Memorable word saved', { userId })

    return NextResponse.json({
      success: true,
      message: 'Memorable word saved successfully'
    })
  } catch (error: any) {
    logger.error('Save memorable word error', error)
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { 
        error: 'Failed to save memorable word',
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}

export const POST = withRateLimit(handlePOST, { strict: true })

