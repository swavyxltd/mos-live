import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { withRateLimit } from '@/lib/api-middleware'

async function handleGET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    let token = searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      )
    }

    // Trim and clean token (in case of whitespace or encoding issues)
    token = token.trim()

    // Log token details for debugging
    logger.info('Fetching invitation by token', {
      tokenLength: token.length,
      tokenPrefix: token.substring(0, 8),
      tokenSuffix: token.substring(token.length - 8),
      environment: process.env.NODE_ENV,
      rawToken: process.env.NODE_ENV === 'development' ? token : undefined
    })

    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: {
        Org: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      }
    })

    logger.info('Invitation lookup result', {
      found: !!invitation,
      invitationId: invitation?.id,
      orgId: invitation?.orgId,
      environment: process.env.NODE_ENV
    })

    if (!invitation) {
      logger.warn('Invitation not found', { 
        tokenPrefix: token.substring(0, 8), 
        tokenLength: token.length,
        environment: process.env.NODE_ENV,
        fullToken: process.env.NODE_ENV === 'development' ? token : undefined
      })
      return NextResponse.json(
        { error: 'Invalid invitation token' },
        { status: 404 }
      )
    }

    // Check if invitation has expired
    if (new Date() > invitation.expiresAt) {
      logger.warn('Invitation expired', { invitationId: invitation.id, expiresAt: invitation.expiresAt })
      return NextResponse.json(
        { error: 'Invitation has expired' },
        { status: 400 }
      )
    }

    // Check if invitation has already been accepted
    if (invitation.acceptedAt) {
      logger.warn('Invitation already accepted', { invitationId: invitation.id, acceptedAt: invitation.acceptedAt })
      return NextResponse.json(
        { error: 'Invitation has already been accepted' },
        { status: 400 }
      )
    }

    // Check if user was already created for this invitation (via /api/users/create)
    // If so, get their name to pre-populate the form
    let userName: string | null = null
    if (invitation.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email: invitation.email },
        select: { name: true }
      })
      if (existingUser?.name) {
        userName = existingUser.name
      }
    }

    return NextResponse.json({
      invitationId: invitation.id,
      orgId: invitation.orgId,
      orgName: invitation.Org.name,
      orgSlug: invitation.Org.slug,
      email: invitation.email,
      name: userName,
      role: invitation.role,
      acceptedAt: invitation.acceptedAt
    })
  } catch (error: any) {
    const token = request.nextUrl.searchParams.get('token')
    logger.error('Error fetching invitation', error, {
      errorMessage: error?.message,
      errorStack: error?.stack,
      tokenPrefix: token?.substring(0, 8),
      tokenLength: token?.length,
      environment: process.env.NODE_ENV,
      errorCode: error?.code,
      errorName: error?.name
    })
    
    const isDevelopment = process.env.NODE_ENV === 'development'
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch invitation',
        message: error?.message || 'An unexpected error occurred',
        ...(isDevelopment && { 
          details: error?.message,
          tokenPrefix: token?.substring(0, 8)
        })
      },
      { status: 500 }
    )
  }
}

export const GET = withRateLimit(handleGET)

