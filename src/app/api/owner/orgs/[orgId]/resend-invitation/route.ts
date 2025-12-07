import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { withRateLimit } from '@/lib/api-middleware'
import { sendOrgSetupInvitation } from '@/lib/mail'
import crypto from 'crypto'

async function handlePOST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> | { orgId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || !session.user.isSuperAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Handle params - in Next.js 15+, params can be a Promise
    const resolvedParams = params instanceof Promise ? await params : params
    const { orgId } = resolvedParams
    
    if (!orgId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })
    }

    // Get the organization
    const org = await prisma.org.findUnique({
      where: { id: orgId },
      select: {
        id: true,
        name: true,
        slug: true,
        email: true
      }
    })

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    if (!org.email) {
      return NextResponse.json(
        { error: 'Organization does not have an admin email address' },
        { status: 400 }
      )
    }

    // Find the most recent unaccepted invitation for this org
    const existingInvitation = await prisma.invitation.findFirst({
      where: {
        orgId: org.id,
        email: org.email,
        acceptedAt: null,
        expiresAt: {
          gt: new Date() // Not expired
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    let token: string
    let invitationId: string

    if (existingInvitation) {
      // Use existing invitation token
      token = existingInvitation.token
      invitationId = existingInvitation.id
      logger.info('Using existing invitation', {
        invitationId,
        orgId: org.id,
        email: org.email
      })
    } else {
      // Create a new invitation
      token = crypto.randomBytes(32).toString('hex')
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7) // 7 days

      invitationId = `inv_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`
      
      await prisma.invitation.create({
        data: {
          id: invitationId,
          orgId: org.id,
          email: org.email,
          role: 'ADMIN',
          token,
          expiresAt,
        },
      })

      logger.info('Created new invitation for resend', {
        invitationId,
        orgId: org.id,
        email: org.email,
        tokenLength: token.length,
        tokenPrefix: token.substring(0, 8)
      })
    }

    // Send the invitation email
    try {
      const baseUrl = process.env.APP_BASE_URL || process.env.NEXTAUTH_URL || 'https://app.madrasah.io'
      const cleanBaseUrl = baseUrl.trim().replace(/\/+$/, '')
      const signupUrl = `${cleanBaseUrl}/auth/signup?token=${encodeURIComponent(token)}`
      
      logger.info('Resending org setup invitation', {
        to: org.email,
        orgName: org.name,
        orgId: org.id,
        invitationId,
        hasResendKey: !!process.env.RESEND_API_KEY
      })
      
      await sendOrgSetupInvitation({
        to: org.email,
        orgName: org.name,
        signupUrl
      })
      
      logger.info('Invitation email resent successfully', {
        to: org.email,
        orgId: org.id,
        invitationId
      })

      return NextResponse.json({
        success: true,
        message: 'Invitation resent successfully',
        invitationId
      })
    } catch (emailError: any) {
      logger.error('Failed to resend invitation email', emailError, {
        to: org.email,
        orgId: org.id,
        invitationId
      })
      return NextResponse.json(
        { error: 'Failed to send invitation email', details: emailError?.message },
        { status: 500 }
      )
    }
  } catch (error: any) {
    logger.error('Error resending invitation', error, {
      errorCode: error?.code,
      errorMessage: error?.message
    })
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { 
        error: 'Failed to resend invitation',
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}

export const POST = withRateLimit(handlePOST)

