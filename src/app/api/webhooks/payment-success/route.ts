export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { OrganisationStatusManager } from '@/lib/org-status-manager'
import { logger } from '@/lib/logger'

async function handlePOST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Extract payment success data from webhook
    const { 
      organisationId, 
      amount 
    } = body

    if (!organisationId) {
      return NextResponse.json({ error: 'Missing organisationId' }, { status: 400 })
    }

    // Handle the payment success
    const result = await OrganisationStatusManager.handlePaymentSuccess(
      organisationId,
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
