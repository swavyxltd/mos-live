export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { OrganisationStatusManager } from '@/lib/org-status-manager'
import { logger } from '@/lib/logger'

async function handlePOST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Extract payment failure data from webhook
    const { 
      organisationId, 
      organisationName, 
      failureReason, 
      amount, 
      failureDate 
    } = body

    if (!organisationId || !organisationName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Handle the payment failure
    const result = await OrganisationStatusManager.handlePaymentFailure({
      orgId: organisationId,
      orgName: organisationName,
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

  } catch (error: any) {
    logger.error('Payment failure webhook error', error)
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { 
        error: 'Internal server error',
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}

export const POST = handlePOST
