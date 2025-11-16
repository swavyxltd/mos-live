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

    const body = await request.json()
    const {
      stripeEnabled,
      stripePublishableKey,
      stripeSecretKey,
      stripeWebhookSecret,
      autoPaymentEnabled,
      cashPaymentEnabled,
      bankTransferEnabled,
      paymentInstructions,
      bankAccountName,
      bankSortCode,
      bankAccountNumber
    } = body

    // Validate that at least one payment method is enabled
    if (!autoPaymentEnabled && !cashPaymentEnabled && !bankTransferEnabled) {
      return NextResponse.json(
        { error: 'At least one payment method must be enabled' },
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
        paymentInstructions: updatedOrg.paymentInstructions,
        bankAccountName: updatedOrg.bankAccountName,
        bankSortCode: updatedOrg.bankSortCode,
        bankAccountNumber: updatedOrg.bankAccountNumber,
        hasStripeConfigured: !!(updatedOrg.stripePublishableKey && updatedOrg.stripeSecretKey)
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
