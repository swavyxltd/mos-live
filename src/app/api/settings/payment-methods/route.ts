export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveOrg } from '@/lib/org'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/roles'
import { logger } from '@/lib/logger'
import { withRateLimit } from '@/lib/api-middleware'
import { getBillingDay, prepareBillingDayUpdate } from '@/lib/billing-day'

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

    // Get billing day using utility function
    const billingDay = getBillingDay(org)
    
    return NextResponse.json({
      stripeEnabled: Boolean(org.stripeEnabled),
      autoPaymentEnabled: Boolean(org.autoPaymentEnabled),
      cashPaymentEnabled: Boolean(org.cashPaymentEnabled),
      bankTransferEnabled: Boolean(org.bankTransferEnabled),
      acceptsCard: Boolean(org.acceptsCard),
      acceptsCash: Boolean(org.acceptsCash),
      acceptsBankTransfer: Boolean(org.acceptsBankTransfer),
      billingDay: billingDay,
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
      return NextResponse.json({ error: 'Organisation not found' }, { status: 404 })
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
      acceptsCard,
      acceptsCash,
      acceptsBankTransfer,
      billingDay,
      paymentInstructions,
      bankAccountName,
      bankSortCode,
      bankAccountNumber
    } = body

    // Helper to convert any value to proper boolean
    const toBoolean = (value: any): boolean => {
      if (value === true || value === 'true' || value === 1 || value === '1') return true
      if (value === false || value === 'false' || value === 0 || value === '0') return false
      return Boolean(value)
    }

    // Build update data object
    const updateData: any = {
      updatedAt: new Date()
    }

    // Stripe settings
    if (stripeEnabled !== undefined) {
      updateData.stripeEnabled = toBoolean(stripeEnabled)
      if (updateData.stripeEnabled) {
        updateData.stripePublishableKey = stripePublishableKey || null
        updateData.stripeSecretKey = stripeSecretKey || null
        updateData.stripeWebhookSecret = stripeWebhookSecret || null
      } else {
        updateData.stripePublishableKey = null
        updateData.stripeSecretKey = null
        updateData.stripeWebhookSecret = null
      }
    }

    if (autoPaymentEnabled !== undefined) {
      updateData.autoPaymentEnabled = toBoolean(autoPaymentEnabled)
    }

    // Payment method fields - update both field sets together
    if (cashPaymentEnabled !== undefined || acceptsCash !== undefined) {
      const cashValue = acceptsCash !== undefined ? toBoolean(acceptsCash) : toBoolean(cashPaymentEnabled)
      updateData.cashPaymentEnabled = cashValue
      updateData.acceptsCash = cashValue
    }

    if (bankTransferEnabled !== undefined || acceptsBankTransfer !== undefined) {
      const bankValue = acceptsBankTransfer !== undefined ? toBoolean(acceptsBankTransfer) : toBoolean(bankTransferEnabled)
      updateData.bankTransferEnabled = bankValue
      updateData.acceptsBankTransfer = bankValue
    }

    if (acceptsCard !== undefined) {
      updateData.acceptsCard = toBoolean(acceptsCard)
    }


    // Validate that at least one payment method is enabled (only if payment methods are being updated)
    const isUpdatingPaymentMethods = acceptsCard !== undefined || acceptsCash !== undefined || acceptsBankTransfer !== undefined || 
                                     cashPaymentEnabled !== undefined || bankTransferEnabled !== undefined
    
    if (isUpdatingPaymentMethods) {
      const finalCard = acceptsCard !== undefined ? toBoolean(acceptsCard) : Boolean(org.acceptsCard)
      const finalCash = acceptsCash !== undefined ? toBoolean(acceptsCash) : 
                       (cashPaymentEnabled !== undefined ? toBoolean(cashPaymentEnabled) : 
                       Boolean(org.acceptsCash || org.cashPaymentEnabled))
      const finalBank = acceptsBankTransfer !== undefined ? toBoolean(acceptsBankTransfer) : 
                       (bankTransferEnabled !== undefined ? toBoolean(bankTransferEnabled) : 
                       Boolean(org.acceptsBankTransfer || org.bankTransferEnabled))
      
      if (!finalCard && !finalCash && !finalBank) {
        return NextResponse.json(
          { error: 'At least one payment method must be enabled' },
          { status: 400 }
        )
      }
    }

    // Validate card payment requires Stripe Connect
    if (acceptsCard !== undefined && toBoolean(acceptsCard) && !org.stripeConnectAccountId) {
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

    if (paymentInstructions !== undefined) {
      updateData.paymentInstructions = paymentInstructions || null
    }

    if (bankAccountName !== undefined) {
      updateData.bankAccountName = bankAccountName || null
    }

    if (bankSortCode !== undefined) {
      updateData.bankSortCode = bankSortCode || null
    }

    if (bankAccountNumber !== undefined) {
      updateData.bankAccountNumber = bankAccountNumber || null
    }

    // Handle billing day - use utility function (allows null to clear)
    let savedBillingDay: number | null | undefined = undefined
    if (billingDay !== undefined) {
      const billingDayUpdate = prepareBillingDayUpdate(billingDay)
      if (billingDayUpdate === null) {
        return NextResponse.json(
          { error: 'Billing day must be between 1 and 28, or empty to clear' },
          { status: 400 }
        )
      }
      updateData.billingDay = billingDayUpdate.billingDay
      updateData.feeDueDay = billingDayUpdate.feeDueDay
      savedBillingDay = billingDayUpdate.billingDay
    }

    // Update organisation payment settings
    const updatedOrg = await prisma.org.update({
      where: { id: org.id },
      data: updateData,
      select: {
        stripeEnabled: true,
        autoPaymentEnabled: true,
        cashPaymentEnabled: true,
        bankTransferEnabled: true,
        acceptsCard: true,
        acceptsCash: true,
        acceptsBankTransfer: true,
        billingDay: true,
        feeDueDay: true,
        paymentInstructions: true,
        bankAccountName: true,
        bankSortCode: true,
        bankAccountNumber: true,
        stripePublishableKey: true,
        stripeSecretKey: true,
        stripeConnectAccountId: true
      }
    })

    // Determine what billing day to return
    // If we just saved one (including null), use that. Otherwise use what's in the database
    const responseBillingDay = savedBillingDay !== undefined
      ? savedBillingDay 
      : getBillingDay(updatedOrg)
    
    return NextResponse.json({
      success: true,
      settings: {
        stripeEnabled: Boolean(updatedOrg.stripeEnabled),
        autoPaymentEnabled: Boolean(updatedOrg.autoPaymentEnabled),
        cashPaymentEnabled: Boolean(updatedOrg.cashPaymentEnabled),
        bankTransferEnabled: Boolean(updatedOrg.bankTransferEnabled),
        acceptsCard: Boolean(updatedOrg.acceptsCard),
        acceptsCash: Boolean(updatedOrg.acceptsCash),
        acceptsBankTransfer: Boolean(updatedOrg.acceptsBankTransfer),
        billingDay: responseBillingDay,
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
