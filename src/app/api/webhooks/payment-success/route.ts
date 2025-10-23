import { NextRequest, NextResponse } from 'next/server'
import { OrganizationStatusManager } from '@/lib/org-status-manager'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Extract payment success data from webhook
    const { 
      organizationId, 
      amount 
    } = body

    if (!organizationId) {
      return NextResponse.json({ error: 'Missing organizationId' }, { status: 400 })
    }

    // Handle the payment success
    const result = await OrganizationStatusManager.handlePaymentSuccess(
      organizationId,
      amount || 0
    )

    return NextResponse.json({
      success: true,
      orgStatus: result.orgStatus,
      failureCountReset: result.failureCountReset
    })

  } catch (error) {
    console.error('Payment success webhook error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
