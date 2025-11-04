import { Resend } from 'resend'

// Check if we're in demo mode
const isDemoMode = () => {
  const result = {
    isDevelopment: process.env.NODE_ENV === 'development',
    noDatabase: !process.env.DATABASE_URL,
    databaseHasDemo: process.env.DATABASE_URL?.includes('demo') || false,
    noApiKey: !process.env.RESEND_API_KEY,
    isDemoKey: process.env.RESEND_API_KEY === 're_demo_key',
  }
  
  const inDemoMode = result.isDevelopment || result.noDatabase || result.databaseHasDemo || result.noApiKey || result.isDemoKey
  
  if (inDemoMode) {
    console.log('⚠️  DEMO MODE ACTIVE:', result)
  }
  
  return inDemoMode
}

export const resend = isDemoMode() ? null : new Resend(process.env.RESEND_API_KEY)

export async function sendEmail({
  to,
  subject,
  html,
  text
}: {
  to: string | string[]
  subject: string
  html?: string
  text?: string
}) {
  // In demo mode, just log the email instead of sending
  if (isDemoMode()) {
    console.log('⚠️  DEMO MODE - Email not sent (logged only):', {
      to: Array.isArray(to) ? to : [to],
      subject,
      reason: {
        isDevelopment: process.env.NODE_ENV === 'development',
        hasDatabase: !!process.env.DATABASE_URL,
        hasApiKey: !!process.env.RESEND_API_KEY,
        apiKeyValue: process.env.RESEND_API_KEY === 're_demo_key' ? 'demo_key' : 'set'
      }
    })
    return { id: 'demo-email-' + Date.now() }
  }

  try {
    // Trim any whitespace/newlines from RESEND_FROM (common issue from env vars)
    const fromAddress = (process.env.RESEND_FROM || 'Madrasah OS <noreply@madrasah.io>').trim()
    console.log('📧 Sending email via Resend:', {
      from: fromAddress,
      to: Array.isArray(to) ? to : [to],
      subject,
      hasApiKey: !!process.env.RESEND_API_KEY,
      isDemoMode: isDemoMode()
    })
    
    const { data, error } = await resend!.emails.send({
      from: fromAddress,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text
    })
    
    if (error) {
      console.error('❌ Resend API error:', {
        error,
        message: error.message,
        name: error.name
      })
      throw new Error(`Failed to send email: ${error.message}`)
    }
    
    console.log('✅ Email sent successfully:', data)
    return data
  } catch (error: any) {
    console.error('❌ Email send error:', {
      error,
      message: error?.message,
      stack: error?.stack
    })
    throw error
  }
}

export async function sendParentInvite({
  to,
  orgName,
  inviteUrl
}: {
  to: string
  orgName: string
  inviteUrl: string
}) {
  return sendEmail({
    to,
    subject: `Welcome to ${orgName} - Complete Your Setup`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Assalamu alaikum!</h2>
        <p>You've been invited to join <strong>${orgName}</strong> on Madrasah OS.</p>
        <p>Click the link below to complete your account setup:</p>
        <a href="${inviteUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">
          Complete Setup
        </a>
        <p>If you have any questions, please contact your madrasah administrator.</p>
        <p>Best regards,<br>The Madrasah OS Team</p>
      </div>
    `,
    text: `Assalamu alaikum! You've been invited to join ${orgName} on Madrasah OS. Complete your setup: ${inviteUrl}`
  })
}

export async function sendPaymentLink({
  to,
  orgName,
  invoiceId,
  amount,
  paymentUrl
}: {
  to: string
  orgName: string
  invoiceId: string
  amount: number
  paymentUrl: string
}) {
  return sendEmail({
    to,
    subject: `Payment Due - ${orgName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Payment Due</h2>
        <p>Invoice #${invoiceId.slice(-8)} for £${(amount / 100).toFixed(2)} is due.</p>
        <p>Click below to pay securely:</p>
        <a href="${paymentUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">
          Pay Now
        </a>
        <p>If you have any questions, please contact your madrasah administrator.</p>
        <p>Best regards,<br>The Madrasah OS Team</p>
      </div>
    `,
    text: `Invoice #${invoiceId.slice(-8)} for £${(amount / 100).toFixed(2)} is due. Pay here: ${paymentUrl}`
  })
}

export async function sendSupportNotification({
  to,
  subject,
  message
}: {
  to: string
  subject: string
  message: string
}) {
  return sendEmail({
    to,
    subject: `Support Update: ${subject}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Support Ticket Update</h2>
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Message:</strong></p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 6px; margin: 15px 0;">
          ${message}
        </div>
        <p>Best regards,<br>The Madrasah OS Team</p>
      </div>
    `,
    text: `Support Update: ${subject}\n\n${message}`
  })
}

export async function sendPaymentFailedPlatform({
  orgName,
  errorMessage
}: {
  orgName: string
  errorMessage: string
}) {
  return sendEmail({
    to: process.env.PLATFORM_ADMIN_EMAIL || 'admin@madrasah.io',
    subject: `Payment Failed - ${orgName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Payment Processing Failed</h2>
        <p><strong>Organization:</strong> ${orgName}</p>
        <p><strong>Error:</strong></p>
        <div style="background-color: #fee; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #dc2626;">
          ${errorMessage}
        </div>
        <p>Please investigate this payment failure.</p>
        <p>Best regards,<br>Madrasah OS System</p>
      </div>
    `,
    text: `Payment Failed - ${orgName}\n\nError: ${errorMessage}`
  })
}

export async function sendPasswordResetEmail({
  to,
  resetUrl
}: {
  to: string
  resetUrl: string
}) {
  // Ensure resetUrl is a proper absolute URL
  let safeResetUrl = resetUrl.trim()
  
  // Remove any duplicate URL patterns (fix malformed URLs)
  // Pattern: https://domain/https://domain/https://domain/path -> https://domain/path
  safeResetUrl = safeResetUrl.replace(/^(https?:\/\/[^\/]+)\/https?:\/\//g, '$1')
  safeResetUrl = safeResetUrl.replace(/^(https?:\/\/[^\/]+)\/([^\/]+)\/https?:\/\//g, '$1')
  
  // Extract the actual domain and path
  const urlMatch = safeResetUrl.match(/^(https?:\/\/[^\/\?]+)(.*)$/)
  if (urlMatch) {
    const [, protocolDomain, path] = urlMatch
    // Remove any remaining protocol/domain duplicates from path
    const cleanPath = path.replace(/\/https?:\/\/[^\/\?]+/g, '').replace(/^\/+/g, '/')
    safeResetUrl = protocolDomain + cleanPath
  }
  
  // If it's not already an absolute URL, make it one
  if (!safeResetUrl.startsWith('http://') && !safeResetUrl.startsWith('https://')) {
    const baseUrl = process.env.APP_BASE_URL || process.env.NEXTAUTH_URL || 'https://app.madrasah.io'
    const cleanBaseUrl = baseUrl.trim().replace(/\/+$/, '')
    safeResetUrl = `${cleanBaseUrl}/${safeResetUrl.replace(/^\//, '')}`
  }
  
  // Final cleanup - ensure single protocol and domain
  safeResetUrl = safeResetUrl.replace(/^(https?:\/\/[^\/]+)\/https?:\/\//g, '$1')
  
  // Escape any HTML in the URL to prevent XSS (but preserve the URL structure)
  const escapedResetUrl = safeResetUrl.replace(/&/g, '&amp;')
  
  console.log('📧 Password reset email:', {
    to,
    originalUrl: resetUrl,
    safeUrl: safeResetUrl,
    escapedUrl: escapedResetUrl
  })
  
  return sendEmail({
    to,
    subject: 'Reset your Madrasah OS password',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #f9fafb; font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 60px 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07); overflow: hidden; max-width: 600px;">
                  <!-- Logo -->
                  <tr>
                    <td align="center" style="padding: 48px 40px 32px 40px;">
                      <img src="${(process.env.APP_BASE_URL || process.env.NEXTAUTH_URL || 'https://app.madrasah.io').replace(/\/$/, '')}/logo.png" alt="Madrasah OS" style="max-width: 198px; height: auto; display: block;" />
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td align="center" style="padding: 0 40px 48px 40px;">
                      <h1 style="margin: 0 0 12px 0; font-size: 28px; font-weight: 600; color: #111827; line-height: 1.4; text-align: center;">
                        Password Reset Request
                      </h1>
                      <p style="margin: 0 0 40px 0; font-size: 16px; color: #6b7280; line-height: 1.6; text-align: center; max-width: 480px; margin-left: auto; margin-right: auto;">
                        You requested to reset your password. Click the button below to continue.
                      </p>
                      
                      <!-- Button -->
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td align="center" style="padding: 0 0 40px 0;">
                            <a href="${escapedResetUrl}" style="display: inline-block; background-color: #3b82f6; color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 10px; font-weight: 600; font-size: 16px; box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);">
                              Reset Password
                            </a>
                          </td>
                        </tr>
                      </table>
                      
                      <!-- Divider -->
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td align="center" style="padding: 0 0 40px 0;">
                            <div style="border-top: 1px solid #e5e7eb; width: 100%; max-width: 520px;"></div>
                          </td>
                        </tr>
                      </table>
                      
                      <!-- Disclaimer -->
                      <p style="margin: 0 0 40px 0; font-size: 14px; color: #9ca3af; line-height: 1.6; text-align: center;">
                        If you didn't request this, you can safely ignore this email.
                      </p>
                      
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
    `,
    text: `Password Reset Request\n\nYou requested to reset your password. Click the link below to continue:\n\n${safeResetUrl}\n\nIf you didn't request this, you can safely ignore this email.`
  })
}

export async function sendOrgSetupInvitation({
  to,
  orgName,
  signupUrl
}: {
  to: string
  orgName: string
  signupUrl: string
}) {
  // Ensure signupUrl is clean
  let safeSignupUrl = signupUrl.trim()
  const urlMatch = safeSignupUrl.match(/^(https?:\/\/[^\/\?]+)(.*)$/)
  if (urlMatch) {
    const [, protocolDomain, path] = urlMatch
    const cleanPath = path.replace(/\/https?:\/\/[^\/\?]+/g, '').replace(/^\/+/g, '/')
    safeSignupUrl = protocolDomain + cleanPath
  }
  const escapedSignupUrl = safeSignupUrl.replace(/&/g, '&amp;')
  
  return sendEmail({
    to,
    subject: `Set up ${orgName} on Madrasah OS`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #f9fafb; font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 60px 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07); overflow: hidden; max-width: 600px;">
                  <!-- Logo -->
                  <tr>
                    <td align="center" style="padding: 48px 40px 32px 40px;">
                      <img src="${(process.env.APP_BASE_URL || process.env.NEXTAUTH_URL || 'https://app.madrasah.io').replace(/\/$/, '')}/logo.png" alt="Madrasah OS" style="max-width: 198px; height: auto; display: block;" />
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td align="center" style="padding: 0 40px 48px 40px;">
                      <h1 style="margin: 0 0 12px 0; font-size: 28px; font-weight: 600; color: #111827; line-height: 1.4; text-align: center;">
                        Welcome to Madrasah OS
                      </h1>
                      <p style="margin: 0 0 24px 0; font-size: 16px; color: #6b7280; line-height: 1.6; text-align: center; max-width: 480px; margin-left: auto; margin-right: auto;">
                        Assalamu alaikum!<br><br>You've been invited to set up <strong>${orgName}</strong> on Madrasah OS. Click below to create your account and complete the setup.
                      </p>
                      
                      <!-- Button -->
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td align="center" style="padding: 0 0 40px 0;">
                            <a href="${escapedSignupUrl}" style="display: inline-block; background-color: #3b82f6; color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 10px; font-weight: 600; font-size: 16px; box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);">
                              Set Up Organization
                            </a>
                          </td>
                        </tr>
                      </table>
                      
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
    `,
    text: `Welcome to Madrasah OS\n\nYou've been invited to set up ${orgName} on Madrasah OS. Click below to create your account:\n\n${safeSignupUrl}\n\nBest regards,\nThe Madrasah OS Team`
  })
}

export async function sendOrgSetupConfirmation({
  to,
  orgName,
  dashboardUrl
}: {
  to: string
  orgName: string
  dashboardUrl: string
}) {
  let safeDashboardUrl = dashboardUrl.trim()
  const urlMatch = safeDashboardUrl.match(/^(https?:\/\/[^\/\?]+)(.*)$/)
  if (urlMatch) {
    const [, protocolDomain, path] = urlMatch
    const cleanPath = path.replace(/\/https?:\/\/[^\/\?]+/g, '').replace(/^\/+/g, '/')
    safeDashboardUrl = protocolDomain + cleanPath
  }
  const escapedDashboardUrl = safeDashboardUrl.replace(/&/g, '&amp;')
  
  return sendEmail({
    to,
    subject: `${orgName} is ready on Madrasah OS`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #f9fafb; font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 60px 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07); overflow: hidden; max-width: 600px;">
                  <!-- Logo -->
                  <tr>
                    <td align="center" style="padding: 48px 40px 32px 40px;">
                      <img src="${(process.env.APP_BASE_URL || process.env.NEXTAUTH_URL || 'https://app.madrasah.io').replace(/\/$/, '')}/logo.png" alt="Madrasah OS" style="max-width: 198px; height: auto; display: block;" />
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td align="center" style="padding: 0 40px 48px 40px;">
                      <h1 style="margin: 0 0 12px 0; font-size: 28px; font-weight: 600; color: #111827; line-height: 1.4; text-align: center;">
                        Organization Setup Complete
                      </h1>
                      <p style="margin: 0 0 24px 0; font-size: 16px; color: #6b7280; line-height: 1.6; text-align: center; max-width: 480px; margin-left: auto; margin-right: auto;">
                        <strong>${orgName}</strong> has been successfully set up on Madrasah OS. You can now start using all features.
                      </p>
                      
                      <!-- Button -->
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td align="center" style="padding: 0 0 40px 0;">
                            <a href="${escapedDashboardUrl}" style="display: inline-block; background-color: #3b82f6; color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 10px; font-weight: 600; font-size: 16px; box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);">
                              Go to Dashboard
                            </a>
                          </td>
                        </tr>
                      </table>
                      
                      <!-- Divider -->
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td align="center" style="padding: 0 0 40px 0;">
                            <div style="border-top: 1px solid #e5e7eb; width: 100%; max-width: 520px;"></div>
                          </td>
                        </tr>
                      </table>
                      
                      <p style="margin: 0 0 40px 0; font-size: 14px; color: #6b7280; line-height: 1.6; text-align: center;">
                        If you need help getting started, visit our support page or contact our team.
                      </p>
                      
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
    `,
    text: `Organization Setup Complete\n\n${orgName} has been successfully set up on Madrasah OS. You can now start using all features.\n\nAccess your dashboard: ${safeDashboardUrl}\n\nBest regards,\nThe Madrasah OS Team`
  })
}

export async function sendParentOnboardingEmail({
  to,
  orgName,
  studentName,
  setupUrl
}: {
  to: string
  orgName: string
  studentName: string
  setupUrl: string
}) {
  // Ensure setupUrl is clean
  let safeSetupUrl = setupUrl.trim()
  const urlMatch = safeSetupUrl.match(/^(https?:\/\/[^\/\?]+)(.*)$/)
  if (urlMatch) {
    const [, protocolDomain, path] = urlMatch
    const cleanPath = path.replace(/\/https?:\/\/[^\/\?]+/g, '').replace(/^\/+/g, '/')
    safeSetupUrl = protocolDomain + cleanPath
  }
  const escapedSetupUrl = safeSetupUrl.replace(/&/g, '&amp;')
  
  return sendEmail({
    to,
    subject: `Complete your ${orgName} account setup`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #f9fafb; font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 60px 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07); overflow: hidden; max-width: 600px;">
                  <!-- Logo -->
                  <tr>
                    <td align="center" style="padding: 48px 40px 32px 40px;">
                      <img src="${(process.env.APP_BASE_URL || process.env.NEXTAUTH_URL || 'https://app.madrasah.io').replace(/\/$/, '')}/logo.png" alt="Madrasah OS" style="max-width: 198px; height: auto; display: block;" />
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td align="center" style="padding: 0 40px 48px 40px;">
                      <h1 style="margin: 0 0 12px 0; font-size: 28px; font-weight: 600; color: #111827; line-height: 1.4; text-align: center;">
                        Welcome to ${orgName}
                      </h1>
                      <p style="margin: 0 0 24px 0; font-size: 16px; color: #6b7280; line-height: 1.6; text-align: center; max-width: 480px; margin-left: auto; margin-right: auto;">
                        Assalamu alaikum!<br><br>We're excited to welcome you and ${studentName} to ${orgName}. Madrasah OS is a comprehensive platform designed to help you stay connected with your child's education, track their progress, manage payments, and communicate with teachers.<br><br>We're here to make managing your child's madrasah experience as simple and convenient as possible. Click below to complete your account setup and get started.
                      </p>
                      
                      <!-- Button -->
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td align="center" style="padding: 0 0 40px 0;">
                            <a href="${escapedSetupUrl}" style="display: inline-block; background-color: #3b82f6; color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 10px; font-weight: 600; font-size: 16px; box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);">
                              Complete Account Setup
                            </a>
                          </td>
                        </tr>
                      </table>
                      
                      <!-- Divider -->
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td align="center" style="padding: 0 0 40px 0;">
                            <div style="border-top: 1px solid #e5e7eb; width: 100%; max-width: 520px;"></div>
                          </td>
                        </tr>
                      </table>
                      
                      <!-- Disclaimer -->
                      <p style="margin: 0 0 40px 0; font-size: 14px; color: #9ca3af; line-height: 1.6; text-align: center;">
                        This link will expire in 7 days. If you have any questions, please contact ${orgName} directly.
                      </p>
                      
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
    `,
    text: `Welcome to ${orgName}\n\nAssalamu alaikum! We're excited to welcome you and ${studentName} to ${orgName}. Madrasah OS is a comprehensive platform designed to help you stay connected with your child's education.\n\nComplete your account setup: ${safeSetupUrl}\n\nThis link will expire in 7 days.`
  })
}

export async function sendStaffInvitation({
  to,
  orgName,
  role,
  signupUrl
}: {
  to: string
  orgName: string
  role: string
  signupUrl: string
}) {
  let safeSignupUrl = signupUrl.trim()
  const urlMatch = safeSignupUrl.match(/^(https?:\/\/[^\/\?]+)(.*)$/)
  if (urlMatch) {
    const [, protocolDomain, path] = urlMatch
    const cleanPath = path.replace(/\/https?:\/\/[^\/\?]+/g, '').replace(/^\/+/g, '/')
    safeSignupUrl = protocolDomain + cleanPath
  }
  const escapedSignupUrl = safeSignupUrl.replace(/&/g, '&amp;')
  
  const roleLabel = role === 'ADMIN' ? 'Administrator' : role === 'STAFF' ? 'Staff Member' : role
  
  return sendEmail({
    to,
    subject: `Join ${orgName} on Madrasah OS`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #f9fafb; font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 60px 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07); overflow: hidden; max-width: 600px;">
                  <!-- Logo -->
                  <tr>
                    <td align="center" style="padding: 48px 40px 32px 40px;">
                      <img src="${(process.env.APP_BASE_URL || process.env.NEXTAUTH_URL || 'https://app.madrasah.io').replace(/\/$/, '')}/logo.png" alt="Madrasah OS" style="max-width: 198px; height: auto; display: block;" />
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td align="center" style="padding: 0 40px 48px 40px;">
                      <h1 style="margin: 0 0 12px 0; font-size: 28px; font-weight: 600; color: #111827; line-height: 1.4; text-align: center;">
                        You've Been Invited
                      </h1>
                      <p style="margin: 0 0 24px 0; font-size: 16px; color: #6b7280; line-height: 1.6; text-align: center; max-width: 480px; margin-left: auto; margin-right: auto;">
                        Assalamu alaikum!<br><br>You've been invited to join <strong>${orgName}</strong> as a <strong>${roleLabel}</strong>. Click below to create your account and get started.
                      </p>
                      
                      <!-- Button -->
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td align="center" style="padding: 0 0 40px 0;">
                            <a href="${escapedSignupUrl}" style="display: inline-block; background-color: #3b82f6; color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 10px; font-weight: 600; font-size: 16px; box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);">
                              Create Account
                            </a>
                          </td>
                        </tr>
                      </table>
                      
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
    `,
    text: `You've Been Invited\n\nYou've been invited to join ${orgName} as a ${roleLabel} on Madrasah OS. Click below to create your account:\n\n${safeSignupUrl}\n\nBest regards,\nThe Madrasah OS Team`
  })
}
