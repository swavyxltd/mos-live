export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { requireRole, requireOrg } from '@/lib/roles'
import { logger } from '@/lib/logger'
import { withRateLimit } from '@/lib/api-middleware'

async function handleGET(request: NextRequest) {
  try {
    const session = await requireRole(['ADMIN', 'OWNER'])(request)
    if (session instanceof NextResponse) return session
    
    const orgId = await requireOrg(request)
    if (orgId instanceof NextResponse) return orgId
    
    // Generate OAuth URL for WhatsApp Embedded Signup
    const clientId = process.env.META_APP_ID
    const redirectUri = encodeURIComponent(process.env.WHATSAPP_EMBEDDED_REDIRECT_URL!)
    const state = encodeURIComponent(JSON.stringify({ orgId, userId: session.user.id }))
    
    const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${clientId}&redirect_uri=${redirectUri}&state=${state}&response_type=code&scope=whatsapp_business_management`
    
    return NextResponse.json({ authUrl })
  } catch (error: any) {
    logger.error('WhatsApp start error', error)
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { 
        error: 'Failed to start WhatsApp integration',
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}

export const GET = withRateLimit(handleGET)
