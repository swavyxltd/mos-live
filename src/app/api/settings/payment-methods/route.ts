export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveOrg } from '@/lib/org'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/roles'
import { logger } from '@/lib/logger'
import { withRateLimit } from '@/lib/api-middleware'

async function handleGET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const org = await getActiveOrg()
    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Return payment method settings (without sensitive keys)
    return NextResponse.json({
      stripeEnabled: org.stripeEnabled,
      autoPaymentEnabled: org.autoPaymentEnabled,
      cashPaymentEnabled: org.cashPaymentEnabled,
      bankTransferEnabled: org.bankTransferEnabled,
      acceptsCard: org.acceptsCard ?? false,
      acceptsCash: org.acceptsCash ?? true,
      acceptsBankTransfer: org.acceptsBankTransfer ?? true,
      billingDay: org.billingDay ?? org.feeDueDay ?? 1,
      stripeConnectAccountId: org.stripeConnectAccountId,
      hasStripeConnect: !!org.stripeConnectAccountId,
      paymentInstructions: org.paymentInstructions,
      bankAccountName: org.bankAccountName,
      bankSortCode: org.bankSortCode,
      bankAccountNumber: org.bankAccountNumber,
      hasStripeConfigured: !!(org.stripePublishableKey && org.stripeSecretKey)
    })
  } catch (error: any) {
    logger.error('Error fetching payment method settings', error)
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { 
        error: 'Failed to fetch payment method settings',
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}

async function handlePUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const org = await getActiveOrg()
    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // IMPORTANT: billingDay can ONLY be updated through this endpoint
    // This is the single source of truth for billing day settings
    // Other endpoints (e.g., /api/settings/organization) explicitly ignore billingDay

    const body = await request.json()
    const {
      stripeEnabled,
      stripePublishableKey,
      stripeSecretKey,
      stripeWebhookSecret,
      autoPaymentEnabled,
      cashPaymentEnabled,
      bankTransferEnabled,
      acceptsCard,
      acceptsCash,
      acceptsBankTransfer,
      billingDay,
      paymentInstructions,
      bankAccountName,
      bankSortCode,
      bankAccountNumber
    } = body

    // Ensure billingDay can only be set through this endpoint (payment methods settings)
    // This prevents it from being updated elsewhere

    // Validate billing day (1-28)
    if (billingDay !== undefined && (billingDay < 1 || billingDay > 28)) {
      return NextResponse.json(
        { error: 'Billing day must be between 1 and 28' },
        { status: 400 }
      )
    }

    // Validate that at least one payment method is enabled
    const cardEnabled = acceptsCard ?? false
    const cashEnabled = acceptsCash ?? true
    const bankEnabled = acceptsBankTransfer ?? true
    
    if (!cardEnabled && !cashEnabled && !bankEnabled) {
      return NextResponse.json(
        { error: 'At least one payment method must be enabled' },
        { status: 400 }
      )
    }

    // Validate card payment requires Stripe Connect
    if (acceptsCard && !org.stripeConnectAccountId) {
      return NextResponse.json(
        { error: 'Stripe Connect account must be connected to enable card payments' },
        { status: 400 }
      )
    }

    // If Stripe is being enabled, validate that keys are provided
    if (stripeEnabled && (!stripePublishableKey || !stripeSecretKey)) {
      return NextResponse.json(
        { error: 'Stripe keys are required when enabling Stripe' },
        { status: 400 }
      )
    }

    // Update organization payment settings
    const updatedOrg = await prisma.org.update({
      where: { id: org.id },
      data: {
        stripeEnabled,
        stripePublishableKey: stripeEnabled ? stripePublishableKey : null,
        stripeSecretKey: stripeEnabled ? stripeSecretKey : null,
        stripeWebhookSecret: stripeEnabled ? stripeWebhookSecret : null,
        autoPaymentEnabled,
        cashPaymentEnabled,
        bankTransferEnabled,
        acceptsCard: acceptsCard ?? false,
        acceptsCash: acceptsCash ?? true,
        acceptsBankTransfer: acceptsBankTransfer ?? true,
        billingDay: billingDay !== undefined ? billingDay : null,
        paymentInstructions,
        bankAccountName: bankAccountName || null,
        bankSortCode: bankSortCode || null,
        bankAccountNumber: bankAccountNumber || null,
        updatedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      settings: {
        stripeEnabled: updatedOrg.stripeEnabled,
        autoPaymentEnabled: updatedOrg.autoPaymentEnabled,
        cashPaymentEnabled: updatedOrg.cashPaymentEnabled,
        bankTransferEnabled: updatedOrg.bankTransferEnabled,
        acceptsCard: updatedOrg.acceptsCard ?? false,
        acceptsCash: updatedOrg.acceptsCash ?? true,
        acceptsBankTransfer: updatedOrg.acceptsBankTransfer ?? true,
        billingDay: updatedOrg.billingDay ?? updatedOrg.feeDueDay ?? 1,
        paymentInstructions: updatedOrg.paymentInstructions,
        bankAccountName: updatedOrg.bankAccountName,
        bankSortCode: updatedOrg.bankSortCode,
        bankAccountNumber: updatedOrg.bankAccountNumber,
        hasStripeConfigured: !!(updatedOrg.stripePublishableKey && updatedOrg.stripeSecretKey),
        hasStripeConnect: !!updatedOrg.stripeConnectAccountId
      }
    })
  } catch (error: any) {
    logger.error('Error updating payment method settings', error)
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { 
        error: 'Failed to update payment method settings',
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}

export const GET = withRateLimit(handleGET)
export const PUT = withRateLimit(handlePUT)
