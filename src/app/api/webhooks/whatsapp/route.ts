export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { verifyWebhook, handleWebhook } from '@/lib/whatsapp'
import { logger } from '@/lib/logger'

async function handleGET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token) {
    const isValid = await verifyWebhook(token)
    
    if (isValid) {
      return new NextResponse(challenge, { status: 200 })
    }
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

async function handlePOST(request: NextRequest) {
  try {
    const body = await request.json()
    await handleWebhook(body)
    return NextResponse.json({ received: true })
  } catch (error: any) {
    logger.error('WhatsApp webhook error', error)
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { 
        error: 'Webhook handler failed',
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}

export const GET = handleGET
export const POST = handlePOST
