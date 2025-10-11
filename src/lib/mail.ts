import { Resend } from 'resend'

// Check if we're in demo mode
const isDemoMode = () => {
  return process.env.NODE_ENV === 'development' || 
         !process.env.DATABASE_URL || 
         process.env.DATABASE_URL.includes('demo') ||
         process.env.RESEND_API_KEY === 're_demo_key'
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
    console.log('📧 DEMO EMAIL:', {
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text
    })
    return { id: 'demo-email-' + Date.now() }
  }

  try {
    const { data, error } = await resend!.emails.send({
      from: process.env.RESEND_FROM || 'Madrasah OS <noreply@madrasah.io>',
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text
    })
    
    if (error) {
      console.error('Resend error:', error)
      throw new Error(`Failed to send email: ${error.message}`)
    }
    
    return data
  } catch (error) {
    console.error('Email send error:', error)
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
