import { prisma } from './prisma'

/**
 * Get platform settings (singleton pattern)
 * Cached for performance - settings don't change frequently
 */
let cachedSettings: any = null
let cacheTimestamp: number = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export async function getPlatformSettings() {
  // Return cached settings if still valid
  if (cachedSettings && Date.now() - cacheTimestamp < CACHE_TTL) {
    return cachedSettings
  }

  try {
    let settings = await prisma.platform_settings.findFirst()
    
    if (!settings) {
      // Create default settings if none exist
      settings = await prisma.platform_settings.create({
        data: {}
      })
    }

    // Cache the settings
    cachedSettings = settings
    cacheTimestamp = Date.now()

    return settings
  } catch (error: any) {
    console.error('Error fetching platform settings:', error)
    // Return default settings on error
    return {
      id: '',
      defaultTimezone: 'Europe/London',
      trialPeriodDays: 14,
      logoUrl: null,
      faviconUrl: null,
      resendApiKey: null,
      emailFromAddress: 'Madrasah OS <noreply@madrasah.io>',
      maintenanceMode: false,
      maintenanceMessage: null,
      scheduledMaintenanceAt: null,
      basePricePerStudent: 100,
      billingDayOfMonth: 1,
      gracePeriodDays: 14,
      autoBillingEnabled: true,
      billingNotificationsEnabled: true,
      stripePublishableKey: null,
      stripeSecretKey: null,
      stripeWebhookSecret: null,
      stripeTestMode: true,
      passwordMinLength: 8,
      passwordRequireUppercase: true,
      passwordRequireLowercase: true,
      passwordRequireNumbers: true,
      passwordRequireSpecial: false,
    }
  }
}

/**
 * Clear the platform settings cache
 * Call this after updating settings
 */
export function clearPlatformSettingsCache() {
  cachedSettings = null
  cacheTimestamp = 0
}

