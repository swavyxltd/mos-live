export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveOrg } from '@/lib/org'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { withRateLimit } from '@/lib/api-middleware'

async function handlePUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Owner accounts don't need payment settings
    if (session.user.isSuperAdmin) {
      return NextResponse.json({ 
        success: true, 
        message: 'Owner accounts do not require payment settings' 
      })
    }

    const org = await getActiveOrg()
    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const body = await request.json()
    const { autoPayEnabled, paymentMethodId, preferredPaymentMethod } = body

    // Update or create parent billing profile
    const billingProfile = await prisma.parentBillingProfile.upsert({
      where: {
        orgId_parentUserId: {
          orgId: org.id,
          parentUserId: session.user.id
        }
      },
      update: {
        autoPayEnabled,
        defaultPaymentMethodId: paymentMethodId,
        preferredPaymentMethod,
        updatedAt: new Date()
      },
      create: {
        orgId: org.id,
        parentUserId: session.user.id,
        autoPayEnabled,
        defaultPaymentMethodId: paymentMethodId,
        preferredPaymentMethod
      }
    })

    return NextResponse.json({ 
      success: true, 
      billingProfile 
    })
  } catch (error: any) {
    logger.error('Error updating payment settings', error)
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { 
        error: 'Failed to update payment settings',
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}

async function handleGET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Owner accounts don't need payment checks
    if (session.user.isSuperAdmin) {
      return NextResponse.json({
        autoPayEnabled: true,
        paymentMethodId: null,
        preferredPaymentMethod: null,
        lastUpdated: null,
        paymentMethods: []
      })
    }

    const org = await getActiveOrg()
    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const billingProfile = await prisma.parentBillingProfile.findUnique({
      where: {
        orgId_parentUserId: {
          orgId: org.id,
          parentUserId: session.user.id
        }
      }
    })

    return NextResponse.json({
      autoPayEnabled: true, // Demo: Show auto-pay as enabled
      paymentMethodId: 'pm_demo_visa', // Demo: Set default payment method
      preferredPaymentMethod: billingProfile?.preferredPaymentMethod || null,
      lastUpdated: billingProfile?.updatedAt?.toISOString() || null,
      // Demo payment methods for demonstration
      paymentMethods: [
        {
          id: 'pm_demo_visa',
          type: 'card',
          last4: '4242',
          brand: 'visa',
          expiryMonth: 12,
          expiryYear: 2025,
          isDefault: true
        },
        {
          id: 'pm_demo_mastercard',
          type: 'card',
          last4: '5555',
          brand: 'mastercard',
          expiryMonth: 8,
          expiryYear: 2026,
          isDefault: false
        }
      ]
    })
  } catch (error: any) {
    logger.error('Error fetching payment settings', error)
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { 
        error: 'Failed to fetch payment settings',
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}

async function handleDELETE() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Owner accounts don't have payment methods to delete
    if (session.user.isSuperAdmin) {
      return NextResponse.json({ 
        success: true, 
        message: 'Owner accounts do not have payment methods' 
      })
    }

    const org = await getActiveOrg()
    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Clear payment method for testing
    await prisma.parentBillingProfile.updateMany({
      where: {
        orgId: org.id,
        parentUserId: session.user.id
      },
      data: {
        defaultPaymentMethodId: null,
        autoPayEnabled: false
      }
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Payment method cleared for testing' 
    })
  } catch (error: any) {
    logger.error('Error clearing payment method', error)
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { 
        error: 'Failed to clear payment method',
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}

export const PUT = withRateLimit(handlePUT)
export const GET = withRateLimit(handleGET)
export const DELETE = withRateLimit(handleDELETE)
