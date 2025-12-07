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

    // Find the most recent invitation for this org (regardless of status)
    // We'll check if we can reuse it, or create a new one
    const mostRecentInvitation = await prisma.invitation.findFirst({
      where: {
        orgId: org.id,
        email: {
          equals: org.email,
          mode: 'insensitive' // Case-insensitive match
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    logger.info('Checking for existing invitation', {
      orgId: org.id,
      orgEmail: org.email,
      foundInvitation: !!mostRecentInvitation,
      invitationId: mostRecentInvitation?.id,
      invitationEmail: mostRecentInvitation?.email,
      invitationAccepted: !!mostRecentInvitation?.acceptedAt,
      invitationExpired: mostRecentInvitation ? new Date() > mostRecentInvitation.expiresAt : null
    })

    let token: string
    let invitationId: string

    // Check if we can reuse the existing invitation
    if (mostRecentInvitation && 
        !mostRecentInvitation.acceptedAt && 
        new Date() < mostRecentInvitation.expiresAt) {
      // Use existing invitation token
      token = mostRecentInvitation.token
      invitationId = mostRecentInvitation.id
      logger.info('Using existing invitation', {
        invitationId,
        orgId: org.id,
        email: org.email,
        expiresAt: mostRecentInvitation.expiresAt
      })
    } else {
      // Create a new invitation (either none exists, or existing is expired/accepted)
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
        tokenPrefix: token.substring(0, 8),
        reason: mostRecentInvitation 
          ? (mostRecentInvitation.acceptedAt ? 'existing was accepted' : 'existing was expired')
          : 'no existing invitation found'
      })
    }

    // Check if email sending is configured
    const hasResendKey = !!process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 're_demo_key'
    if (!hasResendKey) {
      logger.warn('Cannot resend invitation - RESEND_API_KEY not configured', {
        orgId: org.id,
        email: org.email,
        hasApiKey: !!process.env.RESEND_API_KEY,
        isDemoKey: process.env.RESEND_API_KEY === 're_demo_key'
      })
      return NextResponse.json(
        { 
          error: 'Email sending is not configured',
          message: 'RESEND_API_KEY is missing or invalid. Please configure a valid Resend API key to send emails.',
          details: 'Email service not available'
        },
        { status: 503 }
      )
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
        hasResendKey: true
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
        invitationId,
        errorMessage: emailError?.message,
        errorStack: emailError?.stack
      })
      
      // Provide more detailed error message
      const errorMessage = emailError?.message || 'Unknown error occurred'
      const isDevelopment = process.env.NODE_ENV === 'development'
      
      return NextResponse.json(
        { 
          error: 'Failed to send invitation email',
          message: errorMessage,
          ...(isDevelopment && { 
            details: emailError?.message,
            stack: emailError?.stack
          })
        },
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

