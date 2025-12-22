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
        cashPaymentEnabled: true,
        bankTransferEnabled: true,
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
    // Card payments require: acceptsCard enabled AND Stripe Connect account connected
    const hasStripeConnect = !!org.stripeConnectAccountId
    const hasStripeConfigured = !!(org.stripePublishableKey || org.stripeConnectAccountId)
    const cardPaymentsAvailable = Boolean(org.acceptsCard) && hasStripeConnect

    // Check both field sets for cash and bank transfer (they should be in sync, but check both for safety)
    const cashEnabled = Boolean(org.acceptsCash || org.cashPaymentEnabled)
    const bankEnabled = Boolean(org.acceptsBankTransfer || org.bankTransferEnabled)

    // Return payment method settings (without sensitive keys)
    const billingDay = org.billingDay ?? org.feeDueDay ?? null
    
    return NextResponse.json({
      acceptsCard: cardPaymentsAvailable,
      acceptsCash: cashEnabled,
      acceptsBankTransfer: bankEnabled,
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

