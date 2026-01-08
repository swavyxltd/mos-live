import { Resend } from 'resend'
import { generateEmailTemplate } from './email-template'

// Check if we're in demo mode
const isDemoMode = () => {
  // If RESEND_API_KEY is set and valid, always allow sending (regardless of NODE_ENV)
  const apiKey = process.env.RESEND_API_KEY
  
  // Only block if API key is missing or is explicitly the demo key
  if (!apiKey || apiKey === 're_demo_key') {
    return true
  }
  
  // If API key exists and is valid, never block (even in development)
  // This allows testing email sending locally with a real API key
  return false
}

export const resend = isDemoMode() ? null : new Resend(process.env.RESEND_API_KEY)

export async function sendEmail({
  to,
  subject,
  html,
  text,
  forceSend = false
}: {
  to: string | string[]
  subject: string
  html?: string
  text?: string
  forceSend?: boolean
}) {
  // In demo mode, just log the email instead of sending
  // Unless forceSend is true (for critical emails like support tickets)
  if (isDemoMode() && !forceSend) {
    const apiKey = process.env.RESEND_API_KEY
    const demoModeReason = {
      noApiKey: !apiKey,
      isDemoKey: apiKey === 're_demo_key',
    }
    
    console.warn('⚠️ Email not sent (demo mode):', {
      to: Array.isArray(to) ? to : [to],
      subject,
      reason: demoModeReason,
      nodeEnv: process.env.NODE_ENV
    })
    
    // Always throw an error - don't silently fail
    throw new Error(`Email sending is disabled. RESEND_API_KEY is ${!apiKey ? 'missing' : 'set to demo key'}. Please configure a valid Resend API key.`)
  }

  try {
    // Get platform settings for email configuration
    const { getPlatformSettings } = await import('@/lib/platform-settings')
    const platformSettings = await getPlatformSettings()
    
    // Use platform settings for from address, fallback to env var, then default
    const fromAddress = (platformSettings?.emailFromAddress || process.env.RESEND_FROM || 'Madrasah OS <noreply@madrasah.io>').trim()
    
    // Extract domain from from address for verification check
    const fromDomainMatch = fromAddress.match(/@([^\s>]+)/)
    const fromDomain = fromDomainMatch ? fromDomainMatch[1] : null
    
    // Resend API key is managed in Vercel environment variables
    const apiKey = process.env.RESEND_API_KEY
    
    // Create Resend instance with the API key
    const resendInstance = apiKey ? new Resend(apiKey) : null
    
    if (!resendInstance) {
      throw new Error('Resend API key not configured')
    }
    
    // Warn if using default domain that might not be verified
    if (fromDomain === 'madrasah.io' && !process.env.RESEND_FROM && !platformSettings?.emailFromAddress) {
      console.warn('⚠️ Using default domain (madrasah.io). Make sure this domain is verified in Resend.')
    }
    
    console.log('📧 Sending email via Resend:', {
      from: fromAddress,
      to: Array.isArray(to) ? to : [to],
      subject,
      hasApiKey: !!apiKey,
      apiKeyPrefix: apiKey ? apiKey.substring(0, 10) + '...' : 'none',
      isDemoMode: isDemoMode()
    })
    
    const { data, error } = await resendInstance.emails.send({
      from: fromAddress,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text
    })
    
    if (error) {
      const errorDetails = {
        error,
        message: error.message,
        name: error.name,
        statusCode: (error as any)?.statusCode,
        fullError: JSON.stringify(error, null, 2)
      }
      
      console.error('❌ Resend API error:', errorDetails)
      
      // Don't expose internal error messages like "API key is invalid" 
      // since the API key is clearly working (other emails succeed)
      // Provide a generic error message instead
      const errorMessage = error.message || 'Unknown error'
      const isApiKeyError = errorMessage.toLowerCase().includes('api key') || 
                           errorMessage.toLowerCase().includes('invalid') ||
                           errorMessage.toLowerCase().includes('unauthorized')
      
      // In development, include more details in the error
      const isDevelopment = process.env.NODE_ENV === 'development'
      
      if (isApiKeyError) {
        // Generic error message - the API key is working, so this is likely a different issue
        const genericError = new Error('Failed to send email. Please check the server logs for details or try again later.')
        // Attach original error details for debugging
        if (isDevelopment) {
          (genericError as any).originalError = errorDetails
        }
        throw genericError
      } else {
        // For other errors, use a generic message but include original error in development
        const genericError = new Error(isDevelopment 
          ? `Failed to send email: ${errorMessage}` 
          : 'Failed to send email. Please check the server logs for details or try again later.')
        if (isDevelopment) {
          (genericError as any).originalError = errorDetails
        }
        throw genericError
      }
    }
    
    console.log('✅ Email sent successfully via Resend:', {
      emailId: data?.id,
      from: fromAddress,
      to: Array.isArray(to) ? to : [to],
      subject,
      response: data
    })
    
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
  const orgHeaderHtml = `
    <div style="max-width: 100%; margin: 0 auto;">
      <div style="
        display: inline-block;
        text-align: left;
        border-left: 4px solid #22c55e;
        padding: 0 0 0 16px;
      ">
        <div style="
          font-size: 16px;
          font-weight: 600;
          color: #111827;
          margin-bottom: 4px;
          line-height: 1.4;
        ">
          ${orgName}
        </div>
        <div style="
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: #6b7280;
          font-weight: 500;
        ">
          Official Communication
        </div>
      </div>
    </div>
  `

  const html = await generateEmailTemplate({
    title: "Assalamu'alaikum!",
    description: `You've been invited to join <strong>${orgName}</strong> on Madrasah OS. Click below to complete your account setup.`,
    orgHeaderHtml,
    buttonText: 'Complete Setup',
    buttonUrl: inviteUrl,
    footerText: 'If you have any questions, please contact your madrasah administrator.',
    showLogo: true
  })
  
  return sendEmail({
    to,
    subject: `Welcome to ${orgName} - Complete Your Setup`,
    html,
    text: `Assalamu'alaikum! You've been invited to join ${orgName} on Madrasah OS. Complete your setup: ${inviteUrl}`
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
  const orgHeaderHtml = `
    <div style="max-width: 100%; margin: 0 auto;">
      <div style="display: inline-block; text-align: left; border-left: 4px solid #22c55e; padding: 0 0 0 16px;">
        <div style="font-size: 16px; font-weight: 600; color: #111827; margin-bottom: 4px; line-height: 1.4;">
          ${orgName}
        </div>
        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #6b7280; font-weight: 500;">
          Official Communication
        </div>
      </div>
    </div>
  `
  
  const content = `
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #374151; line-height: 1.6;">Assalamu'alaikum,</p>
    <p style="margin: 0 0 24px 0; font-size: 15px; color: #374151; line-height: 1.6;">Invoice #${invoiceId.slice(-8)} for <strong>£${(amount / 100).toFixed(2)}</strong> is due. Please click the button below to pay securely online.</p>
  `
  
  const html = await generateEmailTemplate({
    title: 'Payment Due',
    description: `You have an outstanding invoice for £${(amount / 100).toFixed(2)}. Click below to pay securely.`,
    orgHeaderHtml,
    content,
    buttonText: 'Pay Now',
    buttonUrl: paymentUrl,
    footerText: 'If you have any questions, please contact your madrasah administrator.',
    showLogo: true
  })
  
  return sendEmail({
    to,
    subject: `Payment Due - ${orgName}`,
    html,
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
  const content = `
    <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
      <p style="margin: 0 0 8px 0; font-size: 13px; color: #6b7280; font-weight: 500;">Subject:</p>
      <p style="margin: 0 0 16px 0; font-size: 15px; color: #111827; font-weight: 600;">${subject}</p>
      <p style="margin: 0 0 8px 0; font-size: 13px; color: #6b7280; font-weight: 500;">Message:</p>
      <div style="font-size: 15px; color: #374151; line-height: 1.6;">${message}</div>
    </div>
  `
  
  const html = await generateEmailTemplate({
    title: 'Support Ticket Update',
    description: 'You have received an update on your support ticket.',
    content,
    footerText: 'If you need further assistance, please reply to this email or contact our support team.',
    showLogo: true
  })
  
  return sendEmail({
    to,
    subject: `Support Update: ${subject}`,
    html,
    text: `Support Update: ${subject}\n\n${message}`
  })
}

export async function sendPaymentFailedPlatform({
  to,
  orgName,
  updateUrl,
  amount,
  failureReason
}: {
  to: string
  orgName: string
  updateUrl: string
  amount?: number
  failureReason?: string
}) {
  const amountText = amount ? `£${(amount / 100).toFixed(2)}` : 'your subscription'
  const reasonText = failureReason || 'Payment could not be processed'
  
  const content = `
    <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-left: 4px solid #dc2626; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
      <p style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #991b1b;">Payment Failed</p>
      <p style="margin: 0 0 12px 0; font-size: 15px; color: #7f1d1d; line-height: 1.6;">We were unable to process your payment for <strong>${amountText}</strong> for <strong>${orgName}</strong>.</p>
      <div style="background-color: #fee2e2; border-radius: 6px; padding: 12px; margin-top: 12px;">
        <p style="margin: 0 0 4px 0; font-size: 13px; color: #991b1b; font-weight: 600;">Reason:</p>
        <p style="margin: 0; font-size: 14px; color: #7f1d1d; line-height: 1.5;">${reasonText}</p>
      </div>
    </div>
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #374151; line-height: 1.6;">Don't worry - we'll automatically retry your payment in a few days. In the meantime, you can update your payment method if needed.</p>
  `
  
  const html = await generateEmailTemplate({
    title: 'Payment Update',
    description: "Assalamu'alaikum! We wanted to let you know that we were unable to process your monthly subscription payment. We'll automatically retry the payment in a few days.",
    content,
    buttonText: 'Update Payment Method',
    buttonUrl: updateUrl,
    footerText: 'If you have any questions or need assistance, please contact our support team.',
    showLogo: true
  })
  
  return sendEmail({
    to,
    subject: `Payment Update - ${orgName}`,
    html,
    text: `Payment Update - ${orgName}\n\nAssalamu'alaikum!\n\nWe wanted to let you know that we were unable to process your payment for ${amountText} for ${orgName}.\n\nReason: ${reasonText}\n\nDon't worry - we'll automatically retry your payment in a few days. In the meantime, you can update your payment method if needed.\n\nUpdate your payment method: ${updateUrl}\n\nIf you have any questions, please contact our support team.`
  })
}

export async function sendBillingSuccessEmail({
  to,
  orgName,
  amount,
  studentCount,
  invoiceUrl
}: {
  to: string
  orgName: string
  amount: number
  studentCount: number
  invoiceUrl?: string
}) {
  const amountFormatted = `£${(amount / 100).toFixed(2)}`
  
  const content = `
    <div style="margin-bottom: 24px;">
      <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-left: 4px solid #22c55e; border-radius: 8px; padding: 20px; margin-bottom: 24px; text-align: center;">
        <p style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600; color: #166534;">
          Payment Successful ✓
        </p>
        <p style="margin: 0; font-size: 16px; color: #15803d; line-height: 1.6;">
          Your monthly subscription payment has been processed successfully.
        </p>
      </div>
      
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
        <tr>
          <td style="padding: 0 0 12px 0; font-size: 14px; color: #6b7280; text-align: left;">Organisation:</td>
          <td align="right" style="padding: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #111827; text-align: right;">${orgName}</td>
        </tr>
        <tr>
          <td style="padding: 0 0 12px 0; font-size: 14px; color: #6b7280; text-align: left;">Active Students:</td>
          <td align="right" style="padding: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #111827; text-align: right;">${studentCount}</td>
        </tr>
        <tr>
          <td style="padding: 16px 0 0 0; border-top: 2px solid #e5e7eb; font-size: 16px; font-weight: 600; color: #111827; text-align: left;">Amount Charged:</td>
          <td align="right" style="padding: 16px 0 0 0; border-top: 2px solid #e5e7eb; font-size: 20px; font-weight: 700; color: #059669; text-align: right;">${amountFormatted}</td>
        </tr>
      </table>
      
      <p style="margin: 0; font-size: 16px; color: #374151; line-height: 1.6; text-align: center;">
        Thank you for your continued support. Your account remains active and you can continue using all features.
      </p>
    </div>
  `
  
  const html = await generateEmailTemplate({
    title: 'Billing Successful',
    description: [
      "Assalamu'alaikum!",
      'Your monthly subscription payment has been processed successfully.'
    ],
    content,
    buttonText: invoiceUrl ? 'View Invoice' : undefined,
    buttonUrl: invoiceUrl,
    footerText: 'If you have any questions about this charge, please contact our support team.'
  })
  
  return sendEmail({
    to,
    subject: `Billing Successful - ${orgName}`,
    html,
    text: `Billing Successful - ${orgName}\n\nAssalamu'alaikum!\n\nYour monthly subscription payment has been processed successfully.\n\nOrganisation: ${orgName}\nActive Students: ${studentCount}\nAmount Charged: ${amountFormatted}\n\nThank you for your continued support. Your account remains active and you can continue using all features.\n\n${invoiceUrl ? `View Invoice: ${invoiceUrl}\n\n` : ''}If you have any questions about this charge, please contact our support team.`
  })
}

export async function sendPaymentFailedWarningPlatform({
  to,
  orgName,
  updateUrl,
  amount,
  failureReason
}: {
  to: string
  orgName: string
  updateUrl: string
  amount?: number
  failureReason?: string
}) {
  const amountText = amount ? `£${(amount / 100).toFixed(2)}` : 'your subscription'
  const reasonText = failureReason || 'Payment could not be processed'
  
  const content = `
    <div style="margin-bottom: 24px;">
      <p style="margin: 0 0 16px 0; font-size: 16px; color: #374151; line-height: 1.6; text-align: center;">
        We've attempted to process your payment for <strong>${amountText}</strong> for <strong>${orgName}</strong> multiple times, but were unable to complete it.
      </p>
      <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-left: 4px solid #dc2626; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <p style="margin: 0 0 8px 0; font-size: 14px; color: #991b1b; font-weight: 600; text-align: center;">Latest Reason:</p>
        <p style="margin: 0; font-size: 14px; color: #7f1d1d; line-height: 1.6; text-align: center;">
          ${reasonText}
        </p>
      </div>
      <p style="margin: 16px 0 0 0; font-size: 16px; color: #374151; line-height: 1.6; text-align: center;">
        Please update your payment method within the next 7 days to avoid any interruption to your service. Your account may be temporarily suspended if payment is not resolved.
      </p>
    </div>
  `
  
  const html = await generateEmailTemplate({
    title: 'Payment Action Required',
    description: [
      "Assalamu'alaikum!",
      'We need your attention regarding your subscription payment. Please update your payment method to continue using Madrasah OS without interruption.'
    ],
    content,
    buttonText: 'Update Payment Method',
    buttonUrl: updateUrl,
    footerText: 'If you have any questions or need assistance, please contact our support team immediately.'
  })
  
  return sendEmail({
    to,
    subject: `Payment Action Required - ${orgName}`,
    html,
    text: `Payment Action Required - ${orgName}\n\nAssalamu'alaikum!\n\nWe've attempted to process your payment for ${amountText} for ${orgName} multiple times, but were unable to complete it.\n\nLatest Reason: ${reasonText}\n\nPlease update your payment method within the next 7 days to avoid any interruption to your service. Your account may be temporarily suspended if payment is not resolved.\n\nUpdate your payment method: ${updateUrl}\n\nIf you have any questions, please contact our support team immediately.`
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
  
  const html = await generateEmailTemplate({
    title: 'Password Reset Request',
    description: 'You requested to reset your password. Click the button below to continue.',
    buttonText: 'Reset Password',
    buttonUrl: safeResetUrl,
    footerText: "If you didn't request this, you can safely ignore this email."
  })
  
  return sendEmail({
    to,
    subject: 'Reset your Madrasah OS password',
    html,
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
  // Ensure signupUrl is clean and preserve query parameters
  let safeSignupUrl = signupUrl.trim()
  
  // Parse URL to separate base URL from query string
  try {
    const url = new URL(safeSignupUrl)
    // Reconstruct URL to ensure it's clean but preserve all query parameters
    safeSignupUrl = `${url.protocol}//${url.host}${url.pathname}${url.search}`
  } catch (e) {
    // Fallback to regex-based cleaning if URL parsing fails
    const urlMatch = safeSignupUrl.match(/^(https?:\/\/[^\/\?]+)([^\?]*)(\?.*)?$/)
    if (urlMatch) {
      const [, protocolDomain, path, query] = urlMatch
      const cleanPath = path.replace(/\/https?:\/\/[^\/\?]+/g, '').replace(/^\/+/g, '/')
      safeSignupUrl = protocolDomain + cleanPath + (query || '')
    }
  }
  
  const html = await generateEmailTemplate({
    title: 'Welcome to Madrasah OS',
    description: [
      "Assalamu'alaikum!",
      `You've been invited to set up <strong>${orgName}</strong> on Madrasah OS. Click below to create your account and complete the setup.`
    ],
    buttonText: 'Set Up Organisation',
    buttonUrl: safeSignupUrl
  })
  
  return sendEmail({
    to,
    subject: `Set up ${orgName} on Madrasah OS`,
    html,
    text: `Welcome to Madrasah OS\n\nYou've been invited to set up ${orgName} on Madrasah OS. Click below to create your account:\n\n${safeSignupUrl}\n\nJazakallahu Khairan,\nThe Madrasah OS Team`
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
  
  const html = await generateEmailTemplate({
    title: 'Organisation Setup Complete',
    description: `<strong>${orgName}</strong> has been successfully set up on Madrasah OS. You can now start using all features.`,
    buttonText: 'Go to Dashboard',
    buttonUrl: safeDashboardUrl,
    footerText: 'If you need help getting started, visit our support page or contact our team.'
  })
  
  return sendEmail({
    to,
    subject: `${orgName} is ready on Madrasah OS`,
    html,
    text: `Organisation Setup Complete\n\n${orgName} has been successfully set up on Madrasah OS. You can now start using all features.\n\nAccess your dashboard: ${safeDashboardUrl}\n\nJazakallahu Khairan,\nThe Madrasah OS Team`
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
  
  const orgHeaderHtml = `
    <div style="max-width: 100%; margin: 0 auto;">
      <div style="display: inline-block; text-align: left; border-left: 4px solid #22c55e; padding: 0 0 0 16px;">
        <div style="font-size: 16px; font-weight: 600; color: #111827; margin-bottom: 4px; line-height: 1.4;">
          ${orgName}
        </div>
        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #6b7280; font-weight: 500;">
          Official Communication
        </div>
      </div>
    </div>
  `
  
  const content = `
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #374151; line-height: 1.6;">We're delighted to welcome you and <strong>${studentName}</strong> to <strong>${orgName}</strong>!</p>
    <p style="margin: 0 0 24px 0; font-size: 15px; color: #374151; line-height: 1.6;">Your child's madrasah is now using <strong>Madrasah OS</strong> to enhance their Islamic education experience. Inshallah, this platform will help us work together to support your child's journey in learning the Quran and Islamic knowledge.</p>
  `
  
  const html = await generateEmailTemplate({
    title: "Assalamu'alaikum!",
    description: 'Welcome to our madrasah! Complete your account setup to get started.',
    orgHeaderHtml,
    content,
    buttonText: 'Complete Account Setup',
    buttonUrl: safeSetupUrl,
    footerText: `This link will expire in 7 days. If you have any questions, please contact ${orgName} directly.`,
    showLogo: true
  })
  
  return sendEmail({
    to,
    subject: `Complete your ${orgName} account setup`,
    html,
    text: `Assalamu'alaikum!\n\nWe're delighted to welcome you and ${studentName} to ${orgName}!\n\nYour child's madrasah is now using Madrasah OS to enhance their Islamic education experience. Inshallah, this platform will help us work together to support your child's journey in learning the Quran and Islamic knowledge.\n\nComplete your account setup: ${safeSetupUrl}\n\nWhat is Madrasah OS?\n\nMadrasah OS is a comprehensive platform designed specifically for Islamic education. It helps parents stay connected with their child's learning journey, making it easier to track progress, manage payments, and communicate with teachers—all in one place.\n\nHow We Support Your Child's Education:\n\n• Track Progress - Monitor your child's academic progress and achievements\n• Stay Connected - Direct communication with teachers and staff\n• View Schedule - See class timings and important dates\n• Easy Payments - Pay fees securely online anytime\n• Attendance - Real-time attendance tracking\n• Reports - Access detailed progress reports\n\nJazakallahu Khairan for entrusting us with your child's Islamic education. We're here to support you every step of the way, inshallah.\n\nThis link will expire in 7 days.`
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
  
  const roleLabel = role === 'ADMIN' ? 'Administrator' : role === 'STAFF' ? 'Staff Member' : role
  
  const orgHeaderHtml = `
    <div style="max-width: 100%; margin: 0 auto;">
      <div style="display: inline-block; text-align: left; border-left: 4px solid #22c55e; padding: 0 0 0 16px;">
        <div style="font-size: 16px; font-weight: 600; color: #111827; margin-bottom: 4px; line-height: 1.4;">
          ${orgName}
        </div>
        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #6b7280; font-weight: 500;">
          Official Communication
        </div>
      </div>
    </div>
  `
  
  const html = await generateEmailTemplate({
    title: "You've Been Invited",
    description: `Assalamu'alaikum! You've been invited to join <strong>${orgName}</strong> as an <strong>${roleLabel}</strong>. Click below to create your account and get started.`,
    orgHeaderHtml,
    buttonText: 'Create Account',
    buttonUrl: safeSignupUrl,
    footerText: 'If you have any questions, please contact your organisation administrator.',
    showLogo: true
  })
  
  return sendEmail({
    to,
    subject: `Join ${orgName} on Madrasah OS`,
    html,
    text: `You've Been Invited\n\nYou've been invited to join ${orgName} as a ${roleLabel} on Madrasah OS. Click below to create your account:\n\n${safeSignupUrl}\n\nJazakallahu Khairan,\nThe Madrasah OS Team`
  })
}

export async function sendPaymentConfirmationEmail({
  to,
  orgName,
  studentName,
  className,
  month,
  amount,
  paymentMethod,
  reference,
  paidAt
}: {
  to: string
  orgName: string
  studentName: string
  className: string
  month: string
  amount: number
  paymentMethod: string
  reference?: string | null
  paidAt?: Date | string | null
}) {
  const amountFormatted = `£${(amount / 100).toFixed(2)}`
  const methodLabel = paymentMethod === 'CASH' ? 'Cash' 
    : paymentMethod === 'BANK_TRANSFER' ? 'Bank Transfer' 
    : paymentMethod
  const paidDateText = paidAt
    ? new Date(paidAt).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
    : '—'

  const orgHeaderHtml = `
    <div style="max-width: 100%; margin: 0 auto;">
      <div style="display: inline-block; text-align: left; border-left: 4px solid #22c55e; padding: 0 0 0 16px;">
        <div style="font-size: 16px; font-weight: 600; color: #111827; margin-bottom: 4px; line-height: 1.4;">
          ${orgName}
        </div>
        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #6b7280; font-weight: 500;">
          Official Communication
        </div>
      </div>
    </div>
  `

  const content = `
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
      <tr>
        <td>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding: 0 0 12px 0; font-size: 14px; color: #6b7280; text-align: left;">Student:</td>
              <td align="right" style="padding: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #111827; text-align: right;">${studentName}</td>
            </tr>
            <tr>
              <td style="padding: 0 0 12px 0; font-size: 14px; color: #6b7280; text-align: left;">Class:</td>
              <td align="right" style="padding: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #111827; text-align: right;">${className}</td>
            </tr>
            <tr>
              <td style="padding: 0 0 12px 0; font-size: 14px; color: #6b7280; text-align: left;">Month:</td>
              <td align="right" style="padding: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #111827; text-align: right;">${month}</td>
            </tr>
            <tr>
              <td style="padding: 0 0 12px 0; font-size: 14px; color: #6b7280; text-align: left;">Payment Method:</td>
              <td align="right" style="padding: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #111827; text-align: right;">${methodLabel}</td>
            </tr>
            <tr>
              <td style="padding: 0 0 12px 0; font-size: 14px; color: #6b7280; text-align: left;">Date Paid:</td>
              <td align="right" style="padding: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #111827; text-align: right;">${paidDateText}</td>
            </tr>
            <tr>
              <td style="padding: 16px 0 0 0; border-top: 2px solid #e5e7eb; font-size: 16px; font-weight: 600; color: #111827; text-align: left;">Amount Paid:</td>
              <td align="right" style="padding: 16px 0 0 0; border-top: 2px solid #e5e7eb; font-size: 20px; font-weight: 700; color: #059669; text-align: right;">${amountFormatted}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-left: 4px solid #22c55e; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
      <p style="margin: 0; font-size: 15px; font-weight: 600; color: #166534;">Jazakallahu Khairan</p>
      <p style="margin: 8px 0 0 0; font-size: 15px; color: #15803d; line-height: 1.6;">Thank you for your payment. We appreciate your continued support.</p>
    </div>
  `
  
  const html = await generateEmailTemplate({
    title: 'Payment Confirmation',
    description: "Assalamu'alaikum! This email confirms that your payment has been received and processed.",
    orgHeaderHtml,
    content,
    footerText: `Jazakallahu Khairan,<br>The ${orgName} Team`,
    showLogo: true,
    icon: '✓'
  })
  
  return sendEmail({
    to,
    subject: `Payment Confirmation - ${orgName}`,
    html,
    text: `Payment Confirmation - ${orgName}\n\nAssalamu'alaikum!\n\nThis email confirms that your payment has been received and processed.\n\nStudent: ${studentName}\nClass: ${className}\nMonth: ${month}\nPayment Method: ${methodLabel}\nDate Paid: ${paidDateText}\nAmount Paid: ${amountFormatted}\n\nJazakallahu Khairan\nThank you for your payment. We appreciate your continued support.\n\nJazakallahu Khairan,\nThe ${orgName} Team`
  })
}

export async function sendApplicationAcceptanceEmail({
  to,
  orgName,
  parentName,
  childrenNames,
  signupUrl
}: {
  to: string
  orgName: string
  parentName: string
  childrenNames: string[]
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
  
  const childrenList = childrenNames.length === 1 
    ? childrenNames[0]
    : childrenNames.length === 2
    ? `${childrenNames[0]} and ${childrenNames[1]}`
    : `${childrenNames.slice(0, -1).join(', ')}, and ${childrenNames[childrenNames.length - 1]}`
  
  const orgHeaderHtml = `
    <div style="max-width: 100%; margin: 0 auto;">
      <div style="display: inline-block; text-align: left; border-left: 4px solid #22c55e; padding: 0 0 0 16px;">
        <div style="font-size: 16px; font-weight: 600; color: #111827; margin-bottom: 4px; line-height: 1.4;">
          ${orgName}
        </div>
        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #6b7280; font-weight: 500;">
          Official Communication
        </div>
      </div>
    </div>
  `

  const content = `
    <!-- Congratulations Message -->
    <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-left: 4px solid #22c55e; border-radius: 8px; padding: 20px; margin-bottom: 24px; text-align: center;">
      <p style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600; color: #166534;">
        Alhamdulillah! 🎉
      </p>
      <p style="margin: 0; font-size: 16px; color: #15803d; line-height: 1.6;">
        We are delighted to inform you that your application has been <strong>accepted</strong>!
      </p>
    </div>
    
    <!-- Welcome Message -->
    <p style="margin: 0 0 16px 0; font-size: 16px; color: #374151; line-height: 1.6; text-align: center;">
      Assalamu'alaikum <strong>${parentName}</strong>,
    </p>
    
    <p style="margin: 0 0 24px 0; font-size: 16px; color: #374151; line-height: 1.6; text-align: center;">
      We are thrilled to welcome <strong>${childrenList}</strong> to <strong>${orgName}</strong>. We look forward to supporting ${childrenNames.length === 1 ? 'their' : 'their'} journey in learning the Quran and Islamic knowledge, inshallah.
    </p>
    
    <!-- Sign Up CTA -->
    <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px; margin: 32px 0; text-align: center;">
      <h2 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 600; color: #111827;">
        Create Your Parent Portal Account
      </h2>
      <p style="margin: 0 0 24px 0; font-size: 15px; color: #6b7280; line-height: 1.6;">
        Your child's application has been accepted. Click the button below to create your Parent Portal account and access all our features.
      </p>
      <a href="${safeSignupUrl.replace(/&/g, '&amp;')}" style="display: inline-block; background-color: #111827; color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-weight: 600; font-size: 16px;">
        Sign Up Now
      </a>
    </div>
    
    <!-- Features Section -->
    <div style="margin: 32px 0;">
      <h2 style="margin: 0 0 20px 0; font-size: 18px; font-weight: 600; color: #111827; text-align: center;">
        Why Sign Up? Here's What You'll Get:
      </h2>
      
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
        <!-- Row 1 -->
        <tr>
          <td style="padding: 16px; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; text-align: center; width: 50%;">
            <div style="font-size: 28px; margin-bottom: 8px;">✅</div>
            <h3 style="margin: 0 0 6px 0; font-size: 15px; font-weight: 600; color: #111827;">Track Attendance</h3>
            <p style="margin: 0; font-size: 13px; color: #6b7280; line-height: 1.5;">See your child's daily attendance in real-time</p>
          </td>
          <td style="width: 12px;"></td>
          <td style="padding: 16px; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; text-align: center; width: 50%;">
            <div style="font-size: 28px; margin-bottom: 8px;">📅</div>
            <h3 style="margin: 0 0 6px 0; font-size: 15px; font-weight: 600; color: #111827;">View Holidays</h3>
            <p style="margin: 0; font-size: 13px; color: #6b7280; line-height: 1.5;">Stay informed about school holidays and events</p>
          </td>
        </tr>
        <!-- Row 2 -->
        <tr>
          <td style="padding: 16px; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; text-align: center; width: 50%;">
            <div style="font-size: 28px; margin-bottom: 8px;">📊</div>
            <h3 style="margin: 0 0 6px 0; font-size: 15px; font-weight: 600; color: #111827;">Manage Payments</h3>
            <p style="margin: 0; font-size: 13px; color: #6b7280; line-height: 1.5;">See what you've paid and what's coming up, all in one place</p>
          </td>
          <td style="width: 12px;"></td>
          <td style="padding: 16px; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; text-align: center; width: 50%;">
            <div style="font-size: 28px; margin-bottom: 8px;">💬</div>
            <h3 style="margin: 0 0 6px 0; font-size: 15px; font-weight: 600; color: #111827;">Stay Connected</h3>
            <p style="margin: 0; font-size: 13px; color: #6b7280; line-height: 1.5;">Receive announcements and messages from teachers</p>
          </td>
        </tr>
        <!-- Row 3 -->
        <tr>
          <td style="padding: 16px; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; text-align: center; width: 50%;">
            <div style="font-size: 28px; margin-bottom: 8px;">💰</div>
            <h3 style="margin: 0 0 6px 0; font-size: 15px; font-weight: 600; color: #111827;">Easy Payments</h3>
            <p style="margin: 0; font-size: 13px; color: #6b7280; line-height: 1.5;">Pay fees securely online and view payment history</p>
          </td>
          <td style="width: 12px;"></td>
          <td style="padding: 16px; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; text-align: center; width: 50%;">
            <div style="font-size: 28px; margin-bottom: 8px;">📱</div>
            <h3 style="margin: 0 0 6px 0; font-size: 15px; font-weight: 600; color: #111827;">Mobile Friendly</h3>
            <p style="margin: 0; font-size: 13px; color: #6b7280; line-height: 1.5;">Access everything from your phone, anytime, anywhere</p>
          </td>
        </tr>
      </table>
    </div>
    
    <!-- Closing Message -->
    <p style="margin: 32px 0 0 0; font-size: 16px; color: #374151; line-height: 1.6; text-align: center;">
      Jazakallahu Khairan for choosing <strong>${orgName}</strong>. We're excited to begin this journey with you and your family, inshallah.
    </p>
  `
  
  const html = await generateEmailTemplate({
    title: 'Application Accepted',
    description: 'Alhamdulillah! Your application has been accepted. Welcome to our madrasah.',
    orgHeaderHtml,
    content,
    buttonText: 'Sign Up Now',
    buttonUrl: safeSignupUrl,
    footerText: `If you have any questions, please don't hesitate to contact us. We're here to help!`,
    showLogo: true,
    icon: '🎉'
  })
  
  const text = `Application Accepted - ${orgName}

Alhamdulillah!

We are delighted to inform you that your application has been ACCEPTED!

Assalamu'alaikum ${parentName},

We are thrilled to welcome ${childrenList} to ${orgName}. We look forward to supporting ${childrenNames.length === 1 ? 'their' : 'their'} journey in learning the Quran and Islamic knowledge, inshallah.

Create Your Parent Account

Sign up for a free account to stay connected with your child's education and access all our features.

Sign up here: ${safeSignupUrl}

Why Sign Up? Here's What You'll Get:

✅ Track Attendance - See your child's daily attendance in real-time
📅 View Holidays - Stay informed about school holidays and events
📊 Manage Payments - See what you've paid and what's coming up, all in one place
💬 Stay Connected - Receive announcements and messages from teachers
💰 Easy Payments - Pay fees securely online and view payment history
📱 Mobile Friendly - Access everything from your phone, anytime, anywhere

Jazakallahu Khairan for choosing ${orgName}. We're excited to begin this journey with you and your family, inshallah.

If you have any questions, please don't hesitate to contact us. We're here to help!

Jazakallahu Khairan,
The ${orgName} Team`
  
  return sendEmail({
    to,
    subject: `Application Accepted - Welcome to ${orgName}!`,
    html,
    text
  })
}

export async function sendApplicationSubmissionConfirmation({
  to,
  orgName,
  parentName,
  applicationId
}: {
  to: string
  orgName: string
  parentName: string
  applicationId: string
}) {
  const orgHeaderHtml = `
    <div style="max-width: 100%; margin: 0 auto;">
      <div style="display: inline-block; text-align: left; border-left: 4px solid #22c55e; padding: 0 0 0 16px;">
        <div style="font-size: 16px; font-weight: 600; color: #111827; margin-bottom: 4px; line-height: 1.4;">
          ${orgName}
        </div>
        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #6b7280; font-weight: 500;">
          Official Communication
        </div>
      </div>
    </div>
  `

  const content = `
    <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-left: 4px solid #22c55e; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
      <p style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #166534;">Application Received ✓</p>
      <p style="margin: 0; font-size: 15px; color: #15803d; line-height: 1.6;">Thank you for submitting your application to <strong>${orgName}</strong></p>
    </div>
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #374151; line-height: 1.6;">Assalamu'alaikum <strong>${parentName}</strong>,</p>
    <p style="margin: 0 0 24px 0; font-size: 15px; color: #374151; line-height: 1.6;">We have successfully received your application. Our team will review it and get back to you shortly, inshallah.</p>
  `
  
  const html = await generateEmailTemplate({
    title: 'Application Received',
    description: 'Thank you for submitting your application. We\'ll review it and get back to you shortly.',
    orgHeaderHtml,
    content,
    footerText: `Jazakallahu Khairan,<br>The ${orgName} Team`,
    showLogo: false
  })
  
  const text = `Application Received - ${orgName}

Application Received ✓

Thank you for submitting your application to ${orgName}

Assalamu'alaikum ${parentName},

We have successfully received your application. Our team will review it and get back to you shortly, inshallah.

What Happens Next?

📋 Review - Our team will review your application

If you have any questions, please don't hesitate to contact us. We're here to help!

Jazakallahu Khairan,
The ${orgName} Team`
  
  return sendEmail({
    to,
    subject: `Application Received - ${orgName}`,
    html,
    text
  })
}

export async function sendApplicationRejectionEmail({
  to,
  orgName,
  parentName,
  childrenNames,
  adminNotes
}: {
  to: string
  orgName: string
  parentName: string
  childrenNames: string[]
  adminNotes?: string | null
}) {
  const childrenList = childrenNames.length === 1 
    ? childrenNames[0]
    : childrenNames.length === 2
    ? `${childrenNames[0]} and ${childrenNames[1]}`
    : `${childrenNames.slice(0, -1).join(', ')}, and ${childrenNames[childrenNames.length - 1]}`
  
  const orgHeaderHtml = `
    <div style="max-width: 100%; margin: 0 auto;">
      <div style="display: inline-block; text-align: left; border-left: 4px solid #22c55e; padding: 0 0 0 16px;">
        <div style="font-size: 16px; font-weight: 600; color: #111827; margin-bottom: 4px; line-height: 1.4;">
          ${orgName}
        </div>
        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #6b7280; font-weight: 500;">
          Official Communication
        </div>
      </div>
    </div>
  `

  const content = `
    <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-left: 4px solid #dc2626; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
      <p style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #991b1b;">Application Update</p>
      <p style="margin: 0; font-size: 15px; color: #7f1d1d; line-height: 1.6;">We regret to inform you that your application has been <strong>rejected</strong>.</p>
    </div>
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #374151; line-height: 1.6;">Assalamu'alaikum <strong>${parentName}</strong>,</p>
    <p style="margin: 0 0 24px 0; font-size: 15px; color: #374151; line-height: 1.6;">Thank you for your interest in enrolling <strong>${childrenList}</strong> at <strong>${orgName}</strong>. After careful consideration, we are unable to accept your application at this time.</p>
    ${adminNotes ? `
    <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 24px 0;">
      <h2 style="margin: 0 0 12px 0; font-size: 15px; font-weight: 600; color: #111827;">Additional Information</h2>
      <p style="margin: 0; font-size: 15px; color: #374151; line-height: 1.6;">${adminNotes.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
    </div>
    ` : ''}
    <p style="margin: 24px 0 0 0; font-size: 15px; color: #374151; line-height: 1.6;">We appreciate your understanding and wish you and your family all the best in your search for Islamic education, inshallah.</p>
  `
  
  const html = await generateEmailTemplate({
    title: 'Application Update',
    description: 'We wanted to update you on the status of your application.',
    orgHeaderHtml,
    content,
    footerText: `If you have any questions, please don't hesitate to contact us.`,
    showLogo: true
  })
  
  const text = `Application Update - ${orgName}

Application Update

We regret to inform you that your application has been REJECTED.

Assalamu'alaikum ${parentName},

Thank you for your interest in enrolling ${childrenList} at ${orgName}. After careful consideration, we are unable to accept your application at this time.

${adminNotes ? `Additional Information:\n\n${adminNotes}\n\n` : ''}What You Can Do:

📞 Contact Us - If you have questions, please don't hesitate to reach out

We appreciate your understanding and wish you and your family all the best in your search for Islamic education, inshallah.

If you have any questions, please don't hesitate to contact us.

Jazakallahu Khairan,
The ${orgName} Team`
  
  return sendEmail({
    to,
    subject: `Application Update - ${orgName}`,
    html,
    text
  })
}
