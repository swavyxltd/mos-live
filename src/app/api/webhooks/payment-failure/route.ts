export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { OrganizationStatusManager } from '@/lib/org-status-manager'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Extract payment failure data from webhook
    const { 
      organizationId, 
      organizationName, 
      failureReason, 
      amount, 
      failureDate 
    } = body

    if (!organizationId || !organizationName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Handle the payment failure
    const result = await OrganizationStatusManager.handlePaymentFailure({
      orgId: organizationId,
      orgName: organizationName,
      failureReason: failureReason || 'Payment failed',
      amount: amount || 0,
      failureDate: failureDate ? new Date(failureDate) : new Date()
    })

    return NextResponse.json({
      success: true,
      action: result.action,
      reason: result.reason,
      affectedUsers: result.affectedUsers,
      orgStatus: result.orgStatus
    })

  } catch (error) {
    console.error('Payment failure webhook error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
