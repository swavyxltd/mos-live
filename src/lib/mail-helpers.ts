import { getPlatformSettings } from './platform-settings'

/**
 * Get logo URL for email templates
 * Uses platform settings logo if available, otherwise falls back to default
 */
export async function getLogoUrlForEmail(): Promise<string> {
  const settings = await getPlatformSettings()
  if (settings?.logoUrl) {
    return settings.logoUrl
  }
  
  // Fallback to default logo path
  const baseUrl = process.env.APP_BASE_URL || process.env.NEXTAUTH_URL || 'https://app.madrasah.io'
  return `${baseUrl.replace(/\/$/, '')}/logo.png`
}

