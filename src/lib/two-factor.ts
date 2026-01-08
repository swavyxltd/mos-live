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
  
  const { generateEmailTemplate } = await import('@/lib/email-template')
  
  const content = `
    <div style="background: #f9fafb !important; border: 2px dashed #d1d5db; border-radius: 12px; padding: 32px 24px; text-align: center; margin: 24px 0;">
      <div style="font-size: 42px; font-weight: 700; letter-spacing: 12px; color: #111827 !important; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.2;">
        ${code}
      </div>
    </div>
    <p style="margin: 0 0 24px 0; font-size: 14px; color: #6b7280 !important; line-height: 1.6; text-align: center;">
      This code will expire in <strong style="color: #111827 !important;">10 minutes</strong>.
    </p>
    <div style="background: #fef3c7 !important; border: 1px solid #fde68a; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 8px; margin-top: 24px;">
      <p style="margin: 0; font-size: 13px; color: #92400e !important; line-height: 1.5;">
        <strong style="color: #92400e !important;">Security Notice:</strong> If you didn't request this code, please ignore this email or contact support if you have concerns.
      </p>
    </div>
  `
  
  const html = await generateEmailTemplate({
    title: 'Your Verification Code',
    description: `Assalamu'alaikum ${name}!<br><br>You're signing in to your Madrasah OS account. Use this verification code to complete your login:`,
    content
  })

  const text = `
Madrasah OS - Verification Code

Assalamu'alaikum ${name}!

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

