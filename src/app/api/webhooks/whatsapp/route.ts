import { NextRequest, NextResponse } from 'next/server'
import { verifyWebhook, handleWebhook } from '@/lib/whatsapp'

export async function GET(request: NextRequest) {
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    await handleWebhook(body)
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('WhatsApp webhook error:', error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}
