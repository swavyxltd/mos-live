import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { withRateLimit } from '@/lib/api-middleware'
import crypto from 'crypto'

async function handleGET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || !session.user.isSuperAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get or create platform settings (singleton pattern)
    let settings = await prisma.platform_settings.findFirst()
    
    if (!settings) {
      // Create default settings if none exist
      settings = await prisma.platform_settings.create({
        data: {
          id: crypto.randomUUID(),
          updatedAt: new Date()
        }
      })
    }

    // Don't expose sensitive keys in response
    const safeSettings = {
      ...settings,
      resendApiKey: null, // Managed in Vercel, not shown in settings
      stripeSecretKey: settings.stripeSecretKey ? '***' : null,
      stripeWebhookSecret: settings.stripeWebhookSecret ? '***' : null,
    }

    return NextResponse.json(safeSettings)
  } catch (error: any) {
    logger.error('Error fetching platform settings', error)
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { 
        error: 'Failed to fetch platform settings',
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}

async function handlePUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || !session.user.isSuperAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    
    // Get existing settings or create new
    let settings = await prisma.platform_settings.findFirst()
    
    // Handle masked values - don't update if they're masked (***)
    const updateData: any = {}
    
    if (body.defaultTimezone !== undefined) updateData.defaultTimezone = body.defaultTimezone
    if (body.logoUrl !== undefined) updateData.logoUrl = body.logoUrl
    if (body.faviconUrl !== undefined) updateData.faviconUrl = body.faviconUrl
    if (body.emailFromAddress !== undefined) updateData.emailFromAddress = body.emailFromAddress
    if (body.maintenanceMode !== undefined) updateData.maintenanceMode = body.maintenanceMode
    if (body.maintenanceMessage !== undefined) updateData.maintenanceMessage = body.maintenanceMessage
    if (body.scheduledMaintenanceAt !== undefined) {
      updateData.scheduledMaintenanceAt = body.scheduledMaintenanceAt 
        ? new Date(body.scheduledMaintenanceAt)
        : null
    }
    if (body.basePricePerStudent !== undefined) updateData.basePricePerStudent = body.basePricePerStudent
    if (body.billingDayOfMonth !== undefined) updateData.billingDayOfMonth = body.billingDayOfMonth
    if (body.autoBillingEnabled !== undefined) updateData.autoBillingEnabled = body.autoBillingEnabled
    if (body.stripePublishableKey !== undefined) updateData.stripePublishableKey = body.stripePublishableKey
    if (body.stripeTestMode !== undefined) updateData.stripeTestMode = body.stripeTestMode
    
    // Only update sensitive keys if new value provided (not masked)
    // resendApiKey is managed in Vercel environment variables, not updated here
    if (body.stripeSecretKey && body.stripeSecretKey !== '***') {
      updateData.stripeSecretKey = body.stripeSecretKey
    }
    if (body.stripeWebhookSecret && body.stripeWebhookSecret !== '***') {
      updateData.stripeWebhookSecret = body.stripeWebhookSecret
    }

    // Don't update resendApiKey from settings page - it's managed in Vercel
    // Only update emailFromAddress

    // Security settings
    if (body.passwordMinLength !== undefined) updateData.passwordMinLength = body.passwordMinLength
    if (body.passwordRequireUppercase !== undefined) updateData.passwordRequireUppercase = body.passwordRequireUppercase
    if (body.passwordRequireLowercase !== undefined) updateData.passwordRequireLowercase = body.passwordRequireLowercase
    if (body.passwordRequireNumbers !== undefined) updateData.passwordRequireNumbers = body.passwordRequireNumbers
    if (body.passwordRequireSpecial !== undefined) updateData.passwordRequireSpecial = body.passwordRequireSpecial
    if (body.ownerCalendlyUrl !== undefined) updateData.ownerCalendlyUrl = body.ownerCalendlyUrl

    if (!settings) {
      settings = await prisma.platform_settings.create({
        data: {
          ...updateData,
          id: crypto.randomUUID(),
          updatedAt: new Date()
        }
      })
    } else {
      settings = await prisma.platform_settings.update({
        where: { id: settings.id },
        data: {
          ...updateData,
          updatedAt: new Date()
        }
      })
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        id: crypto.randomUUID(),
        actorUserId: session.user.id,
        action: 'PLATFORM_SETTINGS_UPDATED',
        targetType: 'PLATFORM_SETTINGS',
        targetId: settings.id,
        data: {
          updatedFields: Object.keys(updateData)
        }
      }
    })

    // Clear platform settings cache
    const { clearPlatformSettingsCache } = await import('@/lib/platform-settings')
    clearPlatformSettingsCache()

    // Don't expose sensitive keys in response
    const safeSettings = {
      ...settings,
      resendApiKey: null, // Managed in Vercel, not shown in settings
      stripeSecretKey: settings.stripeSecretKey ? '***' : null,
      stripeWebhookSecret: settings.stripeWebhookSecret ? '***' : null,
    }

    return NextResponse.json({
      success: true,
      settings: safeSettings
    })
  } catch (error: any) {
    logger.error('Error updating platform settings', error)
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { 
        error: 'Failed to update platform settings',
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}

export const GET = withRateLimit(handleGET)
export const PUT = withRateLimit(handlePUT)

