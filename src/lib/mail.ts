import { Resend } from 'resend'
import { generateEmailTemplate } from './email-template'

// Check if we're in demo mode
const isDemoMode = () => {
  // Allow forcing email sending even in development if FORCE_EMAIL_SEND is set
  if (process.env.FORCE_EMAIL_SEND === 'true') {
    return false
  }
  
  const result = {
    isDevelopment: process.env.NODE_ENV === 'development',
    noDatabase: !process.env.DATABASE_URL,
    databaseHasDemo: process.env.DATABASE_URL?.includes('demo') || false,
    noApiKey: !process.env.RESEND_API_KEY,
    isDemoKey: process.env.RESEND_API_KEY === 're_demo_key',
  }
  
  const inDemoMode = result.isDevelopment || result.noDatabase || result.databaseHasDemo || result.noApiKey || result.isDemoKey
  
  if (inDemoMode) {
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
    return { id: 'demo-email-' + Date.now() }
  }

  try {
    // Get platform settings for email configuration
    const { getPlatformSettings } = await import('@/lib/platform-settings')
    const platformSettings = await getPlatformSettings()
    
    // Use platform settings for from address, fallback to env var, then default
    const fromAddress = (platformSettings?.emailFromAddress || process.env.RESEND_FROM || 'Madrasah OS <noreply@madrasah.io>').trim()
    
    // Resend API key is managed in Vercel environment variables
    const apiKey = process.env.RESEND_API_KEY
    
    // Create Resend instance with the API key
    const resendInstance = apiKey ? new Resend(apiKey) : null
    
    if (!resendInstance) {
      throw new Error('Resend API key not configured')
    }
    
    console.log('📧 Sending email via Resend:', {
      from: fromAddress,
      to: Array.isArray(to) ? to : [to],
      subject,
      hasApiKey: !!apiKey,
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
      console.error('❌ Resend API error:', {
        error,
        message: error.message,
        name: error.name
      })
      throw new Error(`Failed to send email: ${error.message}`)
    }
    
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
  const html = await generateEmailTemplate({
    title: "Assalamu'alaikum!",
    description: `You've been invited to join <strong>${orgName}</strong> on Madrasah OS. Click below to complete your account setup.`,
    buttonText: 'Complete Setup',
    buttonUrl: inviteUrl,
    footerText: 'If you have any questions, please contact your madrasah administrator.'
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
  const html = await generateEmailTemplate({
    title: 'Payment Due',
    description: `Invoice #${invoiceId.slice(-8)} for <strong>£${(amount / 100).toFixed(2)}</strong> is due. Click below to pay securely.`,
    buttonText: 'Pay Now',
    buttonUrl: paymentUrl,
    footerText: 'If you have any questions, please contact your madrasah administrator.'
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
    <div style="margin-bottom: 16px;">
      <p style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280; font-weight: 500;">Subject:</p>
      <p style="margin: 0 0 16px 0; font-size: 16px; color: #111827; font-weight: 600;">${subject}</p>
    </div>
    <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-top: 16px;">
      <p style="margin: 0; font-size: 14px; color: #6b7280; font-weight: 500; margin-bottom: 8px;">Message:</p>
      <div style="font-size: 15px; color: #374151; line-height: 1.6;">
        ${message}
      </div>
    </div>
  `
  
  const html = await generateEmailTemplate({
    title: 'Support Ticket Update',
    description: 'You have received an update on your support ticket.',
    content
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
    <div style="margin-bottom: 24px;">
      <p style="margin: 0 0 16px 0; font-size: 16px; color: #374151; line-height: 1.6; text-align: center;">
        We were unable to process your payment for <strong>${amountText}</strong> for <strong>${orgName}</strong>.
      </p>
      <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-left: 4px solid #dc2626; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <p style="margin: 0 0 8px 0; font-size: 14px; color: #991b1b; font-weight: 600; text-align: center;">Reason:</p>
        <p style="margin: 0; font-size: 14px; color: #7f1d1d; line-height: 1.6; text-align: center;">
          ${reasonText}
        </p>
      </div>
      <p style="margin: 16px 0 0 0; font-size: 16px; color: #374151; line-height: 1.6; text-align: center;">
        Don't worry - we'll automatically retry your payment in a few days. In the meantime, you can update your payment method if needed.
      </p>
    </div>
  `
  
  const html = await generateEmailTemplate({
    title: 'Payment Update',
    description: [
      "Assalamu'alaikum!",
      'We wanted to let you know that we were unable to process your monthly subscription payment. We\'ll automatically retry the payment in a few days.'
    ],
    content,
    buttonText: 'Update Payment Method',
    buttonUrl: updateUrl,
    footerText: 'If you have any questions or need assistance, please contact our support team.'
  })
  
  return sendEmail({
    to,
    subject: `Payment Update - ${orgName}`,
    html,
    text: `Payment Update - ${orgName}\n\nAssalamu'alaikum!\n\nWe wanted to let you know that we were unable to process your payment for ${amountText} for ${orgName}.\n\nReason: ${reasonText}\n\nDon't worry - we'll automatically retry your payment in a few days. In the meantime, you can update your payment method if needed.\n\nUpdate your payment method: ${updateUrl}\n\nIf you have any questions, please contact our support team.`
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
  // Ensure signupUrl is clean
  let safeSignupUrl = signupUrl.trim()
  const urlMatch = safeSignupUrl.match(/^(https?:\/\/[^\/\?]+)(.*)$/)
  if (urlMatch) {
    const [, protocolDomain, path] = urlMatch
    const cleanPath = path.replace(/\/https?:\/\/[^\/\?]+/g, '').replace(/^\/+/g, '/')
    safeSignupUrl = protocolDomain + cleanPath
  }
  
  const html = await generateEmailTemplate({
    title: 'Welcome to Madrasah OS',
    description: [
      "Assalamu'alaikum!",
      `You've been invited to set up <strong>${orgName}</strong> on Madrasah OS. Click below to create your account and complete the setup.`
    ],
    buttonText: 'Set Up Organization',
    buttonUrl: safeSignupUrl
  })
  
  return sendEmail({
    to,
    subject: `Set up ${orgName} on Madrasah OS`,
    html,
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
  
  const html = await generateEmailTemplate({
    title: 'Organization Setup Complete',
    description: `<strong>${orgName}</strong> has been successfully set up on Madrasah OS. You can now start using all features.`,
    buttonText: 'Go to Dashboard',
    buttonUrl: safeDashboardUrl,
    footerText: 'If you need help getting started, visit our support page or contact our team.'
  })
  
  return sendEmail({
    to,
    subject: `${orgName} is ready on Madrasah OS`,
    html,
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
  
  const content = `
    <!-- Welcome Message -->
    <p style="margin: 0 0 16px 0; font-size: 16px; color: #374151; line-height: 1.6; text-align: center;">
      We're delighted to welcome you and <strong>${studentName}</strong> to <strong>${orgName}</strong>!
    </p>
    
    <p style="margin: 0 0 24px 0; font-size: 16px; color: #374151; line-height: 1.6; text-align: center;">
      Your child's madrasah is now using <strong>Madrasah OS</strong> to enhance their Islamic education experience. Inshallah, this platform will help us work together to support your child's journey in learning the Quran and Islamic knowledge.
    </p>
    
    <!-- Button - Moved Higher -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 32px 0;">
      <tr>
        <td align="center" style="padding: 0;">
          <a href="${safeSetupUrl.replace(/&/g, '&amp;')}" style="display: inline-block; background-color: #111827; color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-weight: 600; font-size: 16px;">
            Complete Account Setup
          </a>
        </td>
      </tr>
    </table>
    
    <!-- Introduction Section -->
    <div style="margin: 32px 0; padding: 24px; background-color: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">
      <h2 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 600; color: #111827; text-align: center;">
        What is Madrasah OS?
      </h2>
      <p style="margin: 0; font-size: 15px; color: #374151; line-height: 1.6; text-align: center;">
        Madrasah OS is a comprehensive platform designed specifically for Islamic education. It helps parents stay connected with their child's learning journey, making it easier to track progress, manage payments, and communicate with teachers—all in one place.
      </p>
    </div>
    
    <!-- Features Grid (3x2) -->
    <div style="margin: 32px 0;">
      <h2 style="margin: 0 0 20px 0; font-size: 18px; font-weight: 600; color: #111827; text-align: center;">
        How We Support Your Child's Education
      </h2>
      
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
        <!-- Row 1 -->
        <tr>
          <td style="padding: 16px; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; text-align: center; width: 33.33%;">
            <div style="font-size: 24px; margin-bottom: 8px;">📚</div>
            <h3 style="margin: 0 0 6px 0; font-size: 14px; font-weight: 600; color: #111827;">Track Progress</h3>
            <p style="margin: 0; font-size: 12px; color: #6b7280; line-height: 1.4;">Monitor your child's academic progress and achievements</p>
          </td>
          <td style="width: 8px;"></td>
          <td style="padding: 16px; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; text-align: center; width: 33.33%;">
            <div style="font-size: 24px; margin-bottom: 8px;">💬</div>
            <h3 style="margin: 0 0 6px 0; font-size: 14px; font-weight: 600; color: #111827;">Stay Connected</h3>
            <p style="margin: 0; font-size: 12px; color: #6b7280; line-height: 1.4;">Direct communication with teachers and staff</p>
          </td>
          <td style="width: 8px;"></td>
          <td style="padding: 16px; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; text-align: center; width: 33.33%;">
            <div style="font-size: 24px; margin-bottom: 8px;">📅</div>
            <h3 style="margin: 0 0 6px 0; font-size: 14px; font-weight: 600; color: #111827;">View Schedule</h3>
            <p style="margin: 0; font-size: 12px; color: #6b7280; line-height: 1.4;">See class timings and important dates</p>
          </td>
        </tr>
        <tr style="height: 8px;"><td colspan="5"></td></tr>
        <!-- Row 2 -->
        <tr>
          <td style="padding: 16px; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; text-align: center; width: 33.33%;">
            <div style="font-size: 24px; margin-bottom: 8px;">💰</div>
            <h3 style="margin: 0 0 6px 0; font-size: 14px; font-weight: 600; color: #111827;">Easy Payments</h3>
            <p style="margin: 0; font-size: 12px; color: #6b7280; line-height: 1.4;">Pay fees securely online anytime</p>
          </td>
          <td style="width: 8px;"></td>
          <td style="padding: 16px; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; text-align: center; width: 33.33%;">
            <div style="font-size: 24px; margin-bottom: 8px;">✅</div>
            <h3 style="margin: 0 0 6px 0; font-size: 14px; font-weight: 600; color: #111827;">Attendance</h3>
            <p style="margin: 0; font-size: 12px; color: #6b7280; line-height: 1.4;">Real-time attendance tracking</p>
          </td>
          <td style="width: 8px;"></td>
          <td style="padding: 16px; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; text-align: center; width: 33.33%;">
            <div style="font-size: 24px; margin-bottom: 8px;">📊</div>
            <h3 style="margin: 0 0 6px 0; font-size: 14px; font-weight: 600; color: #111827;">Reports</h3>
            <p style="margin: 0; font-size: 12px; color: #6b7280; line-height: 1.4;">Access detailed progress reports</p>
          </td>
        </tr>
      </table>
    </div>
    
    <!-- Closing Message -->
    <p style="margin: 32px 0 0 0; font-size: 16px; color: #374151; line-height: 1.6; text-align: center;">
      Jazakallahu Khairan for entrusting us with your child's Islamic education. We're here to support you every step of the way, inshallah.
    </p>
  `
  
  const html = await generateEmailTemplate({
    title: "Assalamu'alaikum!",
    description: '',
    content,
    footerText: `This link will expire in 7 days. If you have any questions, please contact ${orgName} directly.`
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
  
  const html = await generateEmailTemplate({
    title: "You've Been Invited",
    description: [
      "Assalamu'alaikum!",
      `You've been invited to join <strong>${orgName}</strong> as a <strong>${roleLabel}</strong>. Click below to create your account and get started.`
    ],
    buttonText: 'Create Account',
    buttonUrl: safeSignupUrl
  })
  
  return sendEmail({
    to,
    subject: `Join ${orgName} on Madrasah OS`,
    html,
    text: `You've Been Invited\n\nYou've been invited to join ${orgName} as a ${roleLabel} on Madrasah OS. Click below to create your account:\n\n${safeSignupUrl}\n\nBest regards,\nThe Madrasah OS Team`
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
  reference
}: {
  to: string
  orgName: string
  studentName: string
  className: string
  month: string
  amount: number
  paymentMethod: string
  reference?: string | null
}) {
  const amountFormatted = `£${(amount / 100).toFixed(2)}`
  const methodLabel = paymentMethod === 'CASH' ? 'Cash' 
    : paymentMethod === 'BANK_TRANSFER' ? 'Bank Transfer' 
    : paymentMethod

  const content = `
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
      <tr>
        <td>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding: 0 0 12px 0; font-size: 14px; color: #6b7280;">Student:</td>
              <td align="right" style="padding: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #111827;">${studentName}</td>
            </tr>
            <tr>
              <td style="padding: 0 0 12px 0; font-size: 14px; color: #6b7280;">Class:</td>
              <td align="right" style="padding: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #111827;">${className}</td>
            </tr>
            <tr>
              <td style="padding: 0 0 12px 0; font-size: 14px; color: #6b7280;">Month:</td>
              <td align="right" style="padding: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #111827;">${month}</td>
            </tr>
            <tr>
              <td style="padding: 0 0 12px 0; font-size: 14px; color: #6b7280;">Payment Method:</td>
              <td align="right" style="padding: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #111827;">${methodLabel}</td>
            </tr>
            ${reference ? `
            <tr>
              <td style="padding: 0 0 12px 0; font-size: 14px; color: #6b7280;">Reference:</td>
              <td align="right" style="padding: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #111827; font-family: monospace;">${reference}</td>
            </tr>
            ` : ''}
            <tr>
              <td style="padding: 16px 0 0 0; border-top: 2px solid #e5e7eb; font-size: 16px; font-weight: 600; color: #111827;">Amount Paid:</td>
              <td align="right" style="padding: 16px 0 0 0; border-top: 2px solid #e5e7eb; font-size: 20px; font-weight: 700; color: #059669;">${amountFormatted}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-left: 4px solid #22c55e; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
      <p style="margin: 0; font-size: 16px; font-weight: 600; color: #166534; text-align: center;">
        Jazakallahu Khairan
      </p>
      <p style="margin: 8px 0 0 0; font-size: 14px; color: #15803d; text-align: center;">
        Thank you for your payment. We appreciate your continued support.
      </p>
    </div>
  `
  
  const html = await generateEmailTemplate({
    title: 'Payment Confirmation',
    description: "Assalamu'alaikum! This email confirms that your payment has been received and processed.",
    content
  })
  
  return sendEmail({
    to,
    subject: `Payment Confirmation - ${orgName}`,
    html,
    text: `Payment Confirmation - ${orgName}\n\nAssalamu'alaikum!\n\nThis email confirms that your payment has been received and processed.\n\nStudent: ${studentName}\nClass: ${className}\nMonth: ${month}\nPayment Method: ${methodLabel}\n${reference ? `Reference: ${reference}\n` : ''}Amount Paid: ${amountFormatted}\n\nJazakallahu Khairan\nThank you for your payment. We appreciate your continued support.\n\nBest regards,\n${orgName}`
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
        Create Your Parent Account
      </h2>
      <p style="margin: 0 0 24px 0; font-size: 15px; color: #6b7280; line-height: 1.6;">
        Sign up for a free account to stay connected with your child's education and access all our features.
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
        <tr style="height: 12px;"><td colspan="3"></td></tr>
        <!-- Row 2 -->
        <tr>
          <td style="padding: 16px; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; text-align: center; width: 50%;">
            <div style="font-size: 28px; margin-bottom: 8px;">📊</div>
            <h3 style="margin: 0 0 6px 0; font-size: 15px; font-weight: 600; color: #111827;">Monitor Progress</h3>
            <p style="margin: 0; font-size: 13px; color: #6b7280; line-height: 1.5;">Track your child's academic progress and achievements</p>
          </td>
          <td style="width: 12px;"></td>
          <td style="padding: 16px; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; text-align: center; width: 50%;">
            <div style="font-size: 28px; margin-bottom: 8px;">💬</div>
            <h3 style="margin: 0 0 6px 0; font-size: 15px; font-weight: 600; color: #111827;">Stay Connected</h3>
            <p style="margin: 0; font-size: 13px; color: #6b7280; line-height: 1.5;">Receive announcements and messages from teachers</p>
          </td>
        </tr>
        <tr style="height: 12px;"><td colspan="3"></td></tr>
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
    title: 'Application Accepted - Alhamdulillah!',
    description: '',
    content,
    footerText: `If you have any questions, please don't hesitate to contact us. We're here to help!`,
    showLogo: true
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
📊 Monitor Progress - Track your child's academic progress and achievements
💬 Stay Connected - Receive announcements and messages from teachers
💰 Easy Payments - Pay fees securely online and view payment history
📱 Mobile Friendly - Access everything from your phone, anytime, anywhere

Jazakallahu Khairan for choosing ${orgName}. We're excited to begin this journey with you and your family, inshallah.

If you have any questions, please don't hesitate to contact us. We're here to help!

Best regards,
The ${orgName} Team`
  
  return sendEmail({
    to,
    subject: `Application Accepted - Welcome to ${orgName}!`,
    html,
    text
  })
}
