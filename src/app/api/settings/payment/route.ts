import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveOrg } from '@/lib/org'
import { prisma } from '@/lib/prisma'

export async function PUT(request: NextRequest) {
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
    const { autoPayEnabled, paymentMethodId } = body

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
        updatedAt: new Date()
      },
      create: {
        orgId: org.id,
        parentUserId: session.user.id,
        autoPayEnabled,
        defaultPaymentMethodId: paymentMethodId
      }
    })

    return NextResponse.json({ 
      success: true, 
      billingProfile 
    })
  } catch (error) {
    console.error('Error updating payment settings:', error)
    return NextResponse.json(
      { error: 'Failed to update payment settings' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
      autoPayEnabled: billingProfile?.autoPayEnabled || false,
      paymentMethodId: billingProfile?.defaultPaymentMethodId || null,
      lastUpdated: billingProfile?.updatedAt?.toISOString() || null
    })
  } catch (error) {
    console.error('Error fetching payment settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payment settings' },
      { status: 500 }
    )
  }
}

export async function DELETE() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
  } catch (error) {
    console.error('Error clearing payment method:', error)
    return NextResponse.json(
      { error: 'Failed to clear payment method' },
      { status: 500 }
    )
  }
}
