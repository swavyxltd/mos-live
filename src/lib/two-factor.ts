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
  
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your Verification Code</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Madrasah OS</h1>
        </div>
        <div style="background: #ffffff; padding: 40px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
          <h2 style="color: #111827; margin-top: 0; font-size: 24px;">Your Verification Code</h2>
          <p style="color: #6b7280; font-size: 16px;">Hello ${name},</p>
          <p style="color: #6b7280; font-size: 16px;">You're signing in to your Madrasah OS account. Use this verification code to complete your login:</p>
          <div style="background: #f9fafb; border: 2px dashed #d1d5db; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0;">
            <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #111827; font-family: 'Courier New', monospace;">
              ${code}
            </div>
          </div>
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">This code will expire in 10 minutes.</p>
          <p style="color: #9ca3af; font-size: 12px; margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
            If you didn't request this code, please ignore this email or contact support if you have concerns.
          </p>
        </div>
        <div style="text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px;">
          <p>© ${new Date().getFullYear()} Madrasah OS. All rights reserved.</p>
        </div>
      </body>
    </html>
  `

  const text = `
Madrasah OS - Verification Code

Hello ${name},

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

