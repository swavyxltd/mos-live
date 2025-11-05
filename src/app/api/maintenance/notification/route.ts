import { NextRequest, NextResponse } from 'next/server'
import { getPlatformSettings } from '@/lib/platform-settings'

export async function GET(request: NextRequest) {
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
    console.error('Error fetching maintenance notification:', error)
    return NextResponse.json(
      { error: 'Failed to fetch maintenance notification', details: error.message },
      { status: 500 }
    )
  }
}

