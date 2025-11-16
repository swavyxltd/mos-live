export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { OrganizationStatusManager } from '@/lib/org-status-manager'
import { logger } from '@/lib/logger'

async function handlePOST(request: NextRequest) {
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

  } catch (error: any) {
    logger.error('Payment success webhook error', error)
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
