import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { withRateLimit } from '@/lib/api-middleware'

async function handleGET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      )
    }

    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: {
        org: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      }
    })

    if (!invitation) {
      logger.warn('Invitation not found', { tokenPrefix: token.substring(0, 8) })
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

    return NextResponse.json({
      invitationId: invitation.id,
      orgId: invitation.orgId,
      orgName: invitation.org.name,
      orgSlug: invitation.org.slug,
      email: invitation.email,
      role: invitation.role,
      acceptedAt: invitation.acceptedAt
    })
  } catch (error: any) {
    logger.error('Error fetching invitation', error)
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { 
        error: 'Failed to fetch invitation',
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}

export const GET = withRateLimit(handleGET)

