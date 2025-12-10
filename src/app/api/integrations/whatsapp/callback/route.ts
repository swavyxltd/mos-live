export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import crypto from 'crypto'

async function handleGET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    
    if (!code || !state) {
      return NextResponse.json({ error: 'Missing code or state' }, { status: 400 })
    }
    
    const { orgId, userId } = JSON.parse(decodeURIComponent(state))
    
    // Exchange code for access token
    const tokenResponse = await fetch('https://graph.facebook.com/v18.0/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: process.env.META_APP_ID!,
        client_secret: process.env.META_APP_SECRET!,
        redirect_uri: process.env.WHATSAPP_EMBEDDED_REDIRECT_URL!,
        code
      })
    })
    
    const tokenData = await tokenResponse.json()
    
    if (!tokenData.access_token) {
      throw new Error('Failed to get access token')
    }
    
    // Get WhatsApp Business Account info
    const wabaResponse = await fetch('https://graph.facebook.com/v18.0/me/businesses', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`
      }
    })
    
    const wabaData = await wabaResponse.json()
    
    if (wabaData.data && wabaData.data.length > 0) {
      const businessId = wabaData.data[0].id
      
      // Get phone number ID
      const phoneResponse = await fetch(`https://graph.facebook.com/v18.0/${businessId}/phone_numbers`, {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`
        }
      })
      
      const phoneData = await phoneResponse.json()
      
      if (phoneData.data && phoneData.data.length > 0) {
        const phoneNumberId = phoneData.data[0].id
        
        // Store WhatsApp integration data in org settings
        await prisma.org.update({
          where: { id: orgId },
          data: {
            settings: {
              whatsapp: {
                accessToken: tokenData.access_token,
                phoneNumberId,
                businessId,
                connectedAt: new Date().toISOString()
              }
            }
          }
        })
        
        // Log the action
        await prisma.auditLog.create({
          data: {
            id: crypto.randomUUID(),
            orgId,
            actorUserId: userId,
            action: 'CONNECT_WHATSAPP',
            targetType: 'Integration',
            data: {
              phoneNumberId,
              businessId
            }
          }
        })
        
        return NextResponse.redirect(`${process.env.APP_BASE_URL}/settings?whatsapp=connected`)
      }
    }
    
    throw new Error('Failed to get WhatsApp Business Account info')
  } catch (error: any) {
    logger.error('WhatsApp callback error', error)
    return NextResponse.redirect(`${process.env.APP_BASE_URL}/settings?whatsapp=error`)
  }
}

export const GET = handleGET
