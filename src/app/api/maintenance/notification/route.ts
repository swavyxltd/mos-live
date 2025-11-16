import { NextRequest, NextResponse } from 'next/server'
import { getPlatformSettings } from '@/lib/platform-settings'
import { logger } from '@/lib/logger'
import { withRateLimit } from '@/lib/api-middleware'

async function handleGET(request: NextRequest) {
  try {
    const settings = await getPlatformSettings()
    
    // Check if there's a scheduled maintenance
    if (!settings.scheduledMaintenanceAt) {
      return NextResponse.json({
        hasScheduledMaintenance: false,
        scheduledAt: null,
        message: null,
        hoursUntil: null
      })
    }

    const scheduledAt = new Date(settings.scheduledMaintenanceAt)
    const now = new Date()
    const hoursUntil = (scheduledAt.getTime() - now.getTime()) / (1000 * 60 * 60)

    // Only show notification if within 24 hours and not yet started
    if (hoursUntil > 24 || hoursUntil < 0) {
      return NextResponse.json({
        hasScheduledMaintenance: false,
        scheduledAt: settings.scheduledMaintenanceAt.toISOString(),
        message: settings.maintenanceMessage || null,
        hoursUntil: null
      })
    }

    return NextResponse.json({
      hasScheduledMaintenance: true,
      scheduledAt: settings.scheduledMaintenanceAt.toISOString(),
      message: settings.maintenanceMessage || null,
      hoursUntil: hoursUntil
    })
  } catch (error: any) {
    logger.error('Error fetching maintenance notification', error)
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { 
        error: 'Failed to fetch maintenance notification',
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}

export const GET = withRateLimit(handleGET)

