export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveOrg } from '@/lib/org'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/roles'
import { logger } from '@/lib/logger'
import { withRateLimit } from '@/lib/api-middleware'
import { createConnectAccount, createConnectAccountLink, stripe } from '@/lib/stripe'

async function handlePOST(request: NextRequest) {
  try {
    const session = await requireRole(['OWNER', 'ADMIN'])(request)
    if (session instanceof NextResponse) return session

    const org = await getActiveOrg()
    if (!org) {
      return NextResponse.json({ error: 'Organisation not found' }, { status: 404 })
    }

    // If already connected, return existing account
    if (org.stripeConnectAccountId) {
      return NextResponse.json({
        success: true,
        accountId: org.stripeConnectAccountId,
        message: 'Stripe account already connected'
      })
    }

    const body = await request.json().catch(() => ({}))
    const { accountId } = body

    // If accountId is provided, link existing account instead of creating new one
    if (accountId && accountId.startsWith('acct_')) {
      // Verify the account exists and is accessible
      try {
        const account = await stripe.accounts.retrieve(accountId)
        
        // Update org with existing Connect account ID
        await prisma.org.update({
          where: { id: org.id },
          data: {
            stripeConnectAccountId: accountId
          }
        })

        // Create account link for onboarding if needed
        const baseUrl = process.env.NEXTAUTH_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'https://app.madrasah.io')
        const accountLink = await createConnectAccountLink(
          accountId,
          `${baseUrl}/settings?stripe_connected=true`,
          `${baseUrl}/settings?stripe_connected=true`
        )

        return NextResponse.json({
          success: true,
          accountId: accountId,
          onboardingUrl: accountLink.url,
          message: 'Existing Stripe account linked successfully'
        })
      } catch (error: any) {
        logger.error('Error linking existing Stripe account', error)
        return NextResponse.json(
          { error: `Failed to link account: ${error.message}` },
          { status: 400 }
        )
      }
    }

    // Get org email for Connect account
    const orgEmail = org.email || org.publicEmail
    if (!orgEmail) {
      return NextResponse.json(
        { error: 'Organisation email is required to connect Stripe account' },
        { status: 400 }
      )
    }

    // Create Connect account
    const account = await createConnectAccount(org.id, orgEmail)

    // Update org with Connect account ID
    await prisma.org.update({
      where: { id: org.id },
      data: {
        stripeConnectAccountId: account.id
      }
    })

    // Create account link for onboarding
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const accountLink = await createConnectAccountLink(
      account.id,
      `${baseUrl}/settings?stripe_connected=true`,
      `${baseUrl}/settings?stripe_connected=true`
    )

    return NextResponse.json({
      success: true,
      accountId: account.id,
      onboardingUrl: accountLink.url
    })
  } catch (error: any) {
    logger.error('Error creating Stripe Connect account', { 
      error: error.message, 
      stack: error.stack,
      type: error?.type,
      code: error?.code,
      statusCode: error?.statusCode
    })
    const isDevelopment = process.env.NODE_ENV === 'development'
    
    // Return more specific error message
    const errorMessage = error?.message || 'Failed to create Stripe Connect account'
    
    // Include full error details in development
    const errorDetails: any = {
      error: errorMessage
    }
    
    if (isDevelopment) {
      errorDetails.details = error?.message
      errorDetails.type = error?.type
      errorDetails.code = error?.code
      errorDetails.statusCode = error?.statusCode
      errorDetails.rawError = error?.raw?.message || error?.raw
      errorDetails.apiKeyPrefix = process.env.STRIPE_SECRET_KEY?.substring(0, 7) // Show sk_live or sk_test
    }
    
    // If it's a Connect error, provide specific guidance
    if (error?.message?.includes('Connect') || error?.code === 'account_invalid') {
      errorDetails.suggestion = 'Since you can create accounts manually in Stripe Dashboard, Connect is enabled. The API error suggests your platform account may have restrictions. Contact Stripe Support for assistance.'
    }
    
    return NextResponse.json(errorDetails, { status: 500 })
  }
}

async function handleGET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const org = await getActiveOrg()
    if (!org) {
      return NextResponse.json({ error: 'Organisation not found' }, { status: 404 })
    }

    return NextResponse.json({
      stripeConnectAccountId: org.stripeConnectAccountId,
      isConnected: !!org.stripeConnectAccountId
    })
  } catch (error: any) {
    logger.error('Error fetching Stripe Connect status', error)
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      {
        error: 'Failed to fetch Stripe Connect status',
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}

export const POST = withRateLimit(handlePOST)
export const GET = withRateLimit(handleGET)

