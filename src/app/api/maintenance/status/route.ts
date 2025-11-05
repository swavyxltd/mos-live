import { NextRequest, NextResponse } from 'next/server'
import { getPlatformSettings } from '@/lib/platform-settings'

export async function GET(request: NextRequest) {
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
    console.error('Error fetching maintenance status:', error)
    return NextResponse.json(
      { error: 'Failed to fetch maintenance status', details: error.message },
      { status: 500 }
    )
  }
}

