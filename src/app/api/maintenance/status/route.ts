import { NextRequest, NextResponse } from 'next/server'
import { getPlatformSettings } from '@/lib/platform-settings'
import { logger } from '@/lib/logger'
import { withRateLimit } from '@/lib/api-middleware'

async function handleGET(request: NextRequest) {
  try {
    const settings = await getPlatformSettings()
    
    // Use platform settings logo, fallback to default logo
    const logoUrl = settings.logoUrl || 'https://app.madrasah.io/logo.png'
    
    // Domain is fixed
    const domain = 'www.madrasah.io'
    
    return NextResponse.json({
      maintenanceMode: settings.maintenanceMode || false,
      message: settings.maintenanceMessage || null,
      logoUrl: logoUrl,
      domain: domain
    })
  } catch (error: any) {
    logger.error('Error fetching maintenance status', error)
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { 
        error: 'Failed to fetch maintenance status',
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}

export const GET = withRateLimit(handleGET)

