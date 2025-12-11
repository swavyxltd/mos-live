export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { withRateLimit } from '@/lib/api-middleware'

async function handleGET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const orgSlug = searchParams.get('orgSlug')

    if (!orgSlug) {
      return NextResponse.json(
        { error: 'Organisation slug is required' },
        { status: 400 }
      )
    }

    const org = await prisma.org.findUnique({
      where: { slug: orgSlug },
      select: {
        id: true,
        name: true,
        acceptsCard: true,
        acceptsCash: true,
        acceptsBankTransfer: true,
        stripeEnabled: true,
        stripePublishableKey: true,
        stripeConnectAccountId: true,
        bankAccountName: true,
        bankSortCode: true,
        bankAccountNumber: true,
        paymentInstructions: true,
        billingDay: true,
        feeDueDay: true
      }
    })

    if (!org) {
      return NextResponse.json(
        { error: 'Organisation not found' },
        { status: 404 }
      )
    }

    // Determine if Stripe card payments are available
    const hasStripeConfigured = !!(org.stripePublishableKey || org.stripeConnectAccountId)
    const cardPaymentsAvailable = org.acceptsCard && hasStripeConfigured

    // Return payment method settings (without sensitive keys)
    const billingDay = org.billingDay ?? org.feeDueDay ?? 1
    
    return NextResponse.json({
      acceptsCard: cardPaymentsAvailable,
      acceptsCash: org.acceptsCash ?? true,
      acceptsBankTransfer: org.acceptsBankTransfer ?? true,
      hasStripeConfigured,
      hasStripeConnect: !!org.stripeConnectAccountId,
      stripeEnabled: org.stripeEnabled,
      bankAccountName: org.bankAccountName,
      bankSortCode: org.bankSortCode,
      bankAccountNumber: org.bankAccountNumber, // Full number for standing order setup
      paymentInstructions: org.paymentInstructions,
      billingDay
    })
  } catch (error: any) {
    logger.error('Error fetching public payment methods', error)
    return NextResponse.json(
      { error: 'Failed to fetch payment methods' },
      { status: 500 }
    )
  }
}

export const GET = withRateLimit(handleGET, { strict: true })

