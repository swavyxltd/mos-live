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
      return NextResponse.json({ error: 'Organisation not found' }, { status: 404 })
    }

    // Return payment method settings - always return actual database values as booleans
    // Prioritize billingDay over feeDueDay, but ensure we never return null
    // ALWAYS return a number, never null
    const currentBillingDay = Number(org.billingDay ?? org.feeDueDay ?? 1)
    
    return NextResponse.json({
      stripeEnabled: Boolean(org.stripeEnabled),
      autoPaymentEnabled: Boolean(org.autoPaymentEnabled),
      cashPaymentEnabled: Boolean(org.cashPaymentEnabled),
      bankTransferEnabled: Boolean(org.bankTransferEnabled),
      acceptsCard: Boolean(org.acceptsCard),
      acceptsCash: Boolean(org.acceptsCash),
      acceptsBankTransfer: Boolean(org.acceptsBankTransfer),
      billingDay: currentBillingDay,
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

    // Validate billing day (1-28) - only if it's provided
    if (billingDay !== undefined && billingDay !== null) {
      const numBillingDay = Number(billingDay)
      if (isNaN(numBillingDay) || numBillingDay < 1 || numBillingDay > 28) {
        return NextResponse.json(
          { error: 'Billing day must be between 1 and 28' },
          { status: 400 }
        )
      }
    }

    // Validate that at least one payment method is enabled (only if payment methods are being updated)
    const isUpdatingPaymentMethods = acceptsCard !== undefined || acceptsCash !== undefined || acceptsBankTransfer !== undefined || 
                                     cashPaymentEnabled !== undefined || bankTransferEnabled !== undefined
    
    if (isUpdatingPaymentMethods) {
      // Get final values after update
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

    // Build update data object - ALWAYS update both field sets when provided
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

    // Payment method fields - ALWAYS update both field sets together
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

    // ALWAYS update billingDay if provided - convert to number and ensure it's valid
    if (billingDay !== undefined && billingDay !== null) {
      const numBillingDay = Number(billingDay)
      if (!isNaN(numBillingDay)) {
        const validBillingDay = Math.max(1, Math.min(28, numBillingDay))
        updateData.billingDay = validBillingDay
        // Also update feeDueDay to match billingDay since they're used interchangeably
        updateData.feeDueDay = validBillingDay
        logger.info('Updating billing day', { 
          orgId: org.id, 
          billingDay: validBillingDay,
          originalBillingDay: org.billingDay,
          originalFeeDueDay: org.feeDueDay,
          receivedValue: billingDay,
          convertedValue: numBillingDay
        })
      }
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

    // Log what we're about to update
    if (updateData.billingDay !== undefined) {
      logger.info('About to update org with billingDay', {
        orgId: org.id,
        updateDataBillingDay: updateData.billingDay,
        updateDataFeeDueDay: updateData.feeDueDay,
        fullUpdateData: JSON.stringify(updateData)
      })
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
    
    // Verify the update was successful, especially for billingDay
    if (billingDay !== undefined && billingDay !== null) {
      const expectedValue = Math.max(1, Math.min(28, Number(billingDay)))
      if (updatedOrg.billingDay !== expectedValue || updatedOrg.feeDueDay !== expectedValue) {
        logger.error('Billing day update verification failed', {
          orgId: org.id,
          expected: expectedValue,
          actualBillingDay: updatedOrg.billingDay,
          actualFeeDueDay: updatedOrg.feeDueDay
        })
        // Try to fix it by updating again
        await prisma.org.update({
          where: { id: org.id },
          data: {
            billingDay: expectedValue,
            feeDueDay: expectedValue
          }
        })
        // Re-fetch to get the corrected value
        const correctedOrg = await prisma.org.findUnique({
          where: { id: org.id },
          select: {
            billingDay: true,
            feeDueDay: true,
            stripeEnabled: true,
            autoPaymentEnabled: true,
            cashPaymentEnabled: true,
            bankTransferEnabled: true,
            acceptsCard: true,
            acceptsCash: true,
            acceptsBankTransfer: true,
            paymentInstructions: true,
            bankAccountName: true,
            bankSortCode: true,
            bankAccountNumber: true,
            stripePublishableKey: true,
            stripeSecretKey: true,
            stripeConnectAccountId: true
          }
        })
        if (correctedOrg) {
          Object.assign(updatedOrg, {
            billingDay: correctedOrg.billingDay,
            feeDueDay: correctedOrg.feeDueDay
          })
        }
      }
    }

    // Return updated settings with explicit boolean conversion
    // Use the actual database value, prioritizing billingDay over feeDueDay
    // ALWAYS return a number, never null
    const savedBillingDay = Number(updatedOrg.billingDay ?? updatedOrg.feeDueDay ?? 1)
    logger.info('Returning billing day after update', { 
      orgId: org.id,
      savedBillingDay,
      dbBillingDay: updatedOrg.billingDay,
      dbFeeDueDay: updatedOrg.feeDueDay
    })
    
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
        billingDay: savedBillingDay,
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
