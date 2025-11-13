import { prisma } from './prisma'
import { sendEmail } from './mail'

/**
 * Generate a random 6-digit code for 2FA
 */
export function generateTwoFactorCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

/**
 * Send 2FA code via email using Resend
 */
export async function sendTwoFactorCode(email: string, code: string, userName?: string): Promise<void> {
  const name = userName || 'User'
  
  // Get logo URL for email template
  const { getLogoUrlForEmail } = await import('@/lib/mail-helpers')
  const logoUrl = await getLogoUrlForEmail()
  
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your Verification Code</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f9fafb; font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 60px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07); overflow: hidden; max-width: 600px;">
                <!-- Logo -->
                <tr>
                  <td align="center" style="padding: 48px 40px 32px 40px;">
                    <img src="${logoUrl}" alt="Madrasah OS" style="max-width: 198px; height: auto; display: block;" />
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td align="center" style="padding: 0 40px 48px 40px;">
                    <h1 style="margin: 0 0 12px 0; font-size: 28px; font-weight: 600; color: #111827; line-height: 1.4; text-align: center;">
                      Your Verification Code
                    </h1>
                    <p style="margin: 0 0 24px 0; font-size: 16px; color: #6b7280; line-height: 1.6; text-align: center; max-width: 480px; margin-left: auto; margin-right: auto;">
                      Assalamu alaikum ${name}!<br><br>You're signing in to your Madrasah OS account. Use this verification code to complete your login:
                    </p>
                    
                    <!-- Code Display -->
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" style="padding: 0 0 32px 0;">
                          <div style="background: #f9fafb; border: 2px dashed #d1d5db; border-radius: 12px; padding: 32px 24px; text-align: center; max-width: 400px; margin: 0 auto;">
                            <div style="font-size: 42px; font-weight: 700; letter-spacing: 12px; color: #111827; font-family: 'Courier New', monospace; line-height: 1.2;">
                              ${code}
                            </div>
                          </div>
                        </td>
                      </tr>
                    </table>
                    
                    <p style="margin: 0 0 40px 0; font-size: 14px; color: #6b7280; line-height: 1.6; text-align: center;">
                      This code will expire in <strong>10 minutes</strong>.
                    </p>
                    
                    <!-- Security Notice -->
                    <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 8px; margin: 0 0 40px 0; max-width: 480px; margin-left: auto; margin-right: auto;">
                      <p style="margin: 0; font-size: 13px; color: #92400e; line-height: 1.5;">
                        <strong>Security Notice:</strong> If you didn't request this code, please ignore this email or contact support if you have concerns.
                      </p>
                    </div>
                    
                    <!-- Divider -->
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" style="padding: 0 0 40px 0;">
                          <div style="border-top: 1px solid #e5e7eb; width: 100%; max-width: 520px;"></div>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Footer Links -->
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" style="padding: 0; border-top: 1px solid #e5e7eb;">
                          <table cellpadding="0" cellspacing="0" style="margin: 32px auto 0 auto;">
                            <tr>
                              <td align="center" style="padding: 0 16px;">
                                <a href="https://madrasah.io" style="font-size: 12px; color: #6b7280; text-decoration: none; line-height: 1.6;">
                                  madrasah.io
                                </a>
                              </td>
                              <td style="padding: 0 16px;">
                                <span style="font-size: 12px; color: #d1d5db;">•</span>
                              </td>
                              <td align="center" style="padding: 0 16px;">
                                <a href="https://app.madrasah.io/support" style="font-size: 12px; color: #6b7280; text-decoration: none; line-height: 1.6;">
                                  Support
                                </a>
                              </td>
                            </tr>
                          </table>
                          <p style="margin: 24px 0 0 0; font-size: 11px; color: #9ca3af; text-align: center;">
                            © ${new Date().getFullYear()} Madrasah OS. All rights reserved.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `

  const text = `
Madrasah OS - Verification Code

Assalamu alaikum ${name}!

You're signing in to your Madrasah OS account. Use this verification code to complete your login:

${code}

This code will expire in 10 minutes.

If you didn't request this code, please ignore this email or contact support if you have concerns.

© ${new Date().getFullYear()} Madrasah OS. All rights reserved.
  `

  await sendEmail({
    to: email,
    subject: 'Your Madrasah OS Verification Code',
    html,
    text
  })
}

/**
 * Store 2FA code in database with expiry
 */
export async function storeTwoFactorCode(userId: string, code: string): Promise<void> {
  const expiryTime = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

  await prisma.user.update({
    where: { id: userId },
    data: {
      twoFactorCode: code,
      twoFactorCodeExpiry: expiryTime
    }
  })
}

/**
 * Verify 2FA code and clear it if valid
 */
export async function verifyTwoFactorCode(userId: string, code: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      twoFactorCode: true,
      twoFactorCodeExpiry: true
    }
  })

  if (!user || !user.twoFactorCode || !user.twoFactorCodeExpiry) {
    return false
  }

  // Check if code has expired
  if (user.twoFactorCodeExpiry < new Date()) {
    // Clear expired code
    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorCode: null,
        twoFactorCodeExpiry: null
      }
    })
    return false
  }

  // Verify code matches
  if (user.twoFactorCode !== code) {
    return false
  }

  // Code is valid - clear it and update last 2FA time
  await prisma.user.update({
    where: { id: userId },
    data: {
      twoFactorCode: null,
      twoFactorCodeExpiry: null,
      lastTwoFactorAt: new Date()
    }
  })

  return true
}

/**
 * Clear 2FA code (e.g., after successful login or timeout)
 */
export async function clearTwoFactorCode(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      twoFactorCode: null,
      twoFactorCodeExpiry: null
    }
  })
}

/**
 * Check if user has 2FA enabled
 */
export async function isTwoFactorEnabled(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { twoFactorEnabled: true }
  })

  return user?.twoFactorEnabled ?? true // Default to enabled
}

