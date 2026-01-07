import { NextRequest, NextResponse } from 'next/server'
import { generateEmailTemplate } from '@/lib/email-template'
import { logger } from '@/lib/logger'

// Demo data for email previews
const demoData = {
  orgName: 'Leicester Islamic Centre',
  parentName: 'Ahmed Ali',
  parentEmail: 'ahmed.ali@example.com',
  studentName: 'Fatima Ali',
  childrenNames: ['Fatima Ali', 'Hassan Ali'],
  className: 'Quran Class A',
  month: 'January 2025',
  amount: 5000, // £50.00 in pence
  paymentMethod: 'CASH',
  reference: 'REF123456',
  applicationId: 'app_abc123xyz',
  signupUrl: 'https://app.madrasah.io/auth/parent-setup?token=demo_token_123',
  resetUrl: 'https://app.madrasah.io/auth/reset-password?token=demo_reset_token',
  inviteUrl: 'https://app.madrasah.io/auth/signup?token=demo_invite_token',
  updateUrl: 'https://app.madrasah.io/settings?tab=subscription',
  failureReason: 'Your card was declined',
  supportSubject: 'Payment Issue',
  supportMessage: 'I am having trouble making a payment. Can you help?'
}

// Helper function to create org header HTML
const createOrgHeader = (orgName: string) => `
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

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const emailType = searchParams.get('type')

  try {
    let html = ''

    switch (emailType) {
      case 'application-submission': {
        const orgHeaderHtml = createOrgHeader(demoData.orgName)
        const content = `
          <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-left: 4px solid #22c55e; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
            <p style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #166534;">Application Received ✓</p>
            <p style="margin: 0; font-size: 15px; color: #15803d; line-height: 1.6;">Thank you for submitting your application to <strong>${demoData.orgName}</strong></p>
          </div>
          <p style="margin: 0 0 16px 0; font-size: 15px; color: #374151; line-height: 1.6;">Assalamu'alaikum <strong>${demoData.parentName}</strong>,</p>
          <p style="margin: 0 0 24px 0; font-size: 15px; color: #374151; line-height: 1.6;">We have successfully received your application. Our team will review it and get back to you shortly, inshallah.</p>
        `
        html = await generateEmailTemplate({
          title: 'Application Received',
          description: 'Thank you for submitting your application. We\'ll review it and get back to you shortly.',
          orgHeaderHtml,
          content,
          footerText: `Jazakallahu Khairan,<br>The ${demoData.orgName} Team`,
          showLogo: true,
          icon: '✓'
        })
        break
      }

      case 'application-acceptance': {
        const childrenList = demoData.childrenNames.length === 1 
          ? demoData.childrenNames[0]
          : demoData.childrenNames.length === 2
          ? `${demoData.childrenNames[0]} and ${demoData.childrenNames[1]}`
          : `${demoData.childrenNames.slice(0, -1).join(', ')}, and ${demoData.childrenNames[demoData.childrenNames.length - 1]}`
        
        const orgHeaderHtml = createOrgHeader(demoData.orgName)
        const content = `
          <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-left: 4px solid #22c55e; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
            <p style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #166534;">Alhamdulillah! 🎉</p>
            <p style="margin: 0; font-size: 15px; color: #15803d; line-height: 1.6;">We are delighted to inform you that your application has been <strong>accepted</strong>!</p>
          </div>
          <p style="margin: 0 0 16px 0; font-size: 15px; color: #374151; line-height: 1.6;">Assalamu'alaikum <strong>${demoData.parentName}</strong>,</p>
          <p style="margin: 0 0 24px 0; font-size: 15px; color: #374151; line-height: 1.6;">We are thrilled to welcome <strong>${childrenList}</strong> to <strong>${demoData.orgName}</strong>. We look forward to supporting their journey in learning the Quran and Islamic knowledge, inshallah.</p>
          <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 24px 0;">
            <h2 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: #111827;">Create Your Parent Account</h2>
            <p style="margin: 0 0 20px 0; font-size: 15px; color: #6b7280; line-height: 1.6;">Sign up for a free account to stay connected with your child's education and access all our features.</p>
          </div>
        `
        html = await generateEmailTemplate({
          title: 'Application Accepted',
          description: 'Alhamdulillah! Your application has been accepted. Welcome to our madrasah.',
          orgHeaderHtml,
          content,
          buttonText: 'Sign Up Now',
          buttonUrl: demoData.signupUrl,
          footerText: `If you have any questions, please don't hesitate to contact us. We're here to help!`,
          showLogo: true,
          icon: '🎉'
        })
        break
      }

      case 'application-rejection': {
        const childrenList = demoData.childrenNames.length === 1 
          ? demoData.childrenNames[0]
          : demoData.childrenNames.length === 2
          ? `${demoData.childrenNames[0]} and ${demoData.childrenNames[1]}`
          : `${demoData.childrenNames.slice(0, -1).join(', ')}, and ${demoData.childrenNames[demoData.childrenNames.length - 1]}`
        
        const orgHeaderHtml = createOrgHeader(demoData.orgName)
        const content = `
          <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-left: 4px solid #dc2626; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
            <p style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #991b1b;">Application Update</p>
            <p style="margin: 0; font-size: 15px; color: #7f1d1d; line-height: 1.6;">We regret to inform you that your application has been <strong>rejected</strong>.</p>
          </div>
          <p style="margin: 0 0 16px 0; font-size: 15px; color: #374151; line-height: 1.6;">Assalamu'alaikum <strong>${demoData.parentName}</strong>,</p>
          <p style="margin: 0 0 24px 0; font-size: 15px; color: #374151; line-height: 1.6;">Thank you for your interest in enrolling <strong>${childrenList}</strong> at <strong>${demoData.orgName}</strong>. After careful consideration, we are unable to accept your application at this time.</p>
          <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 24px 0;">
            <h2 style="margin: 0 0 12px 0; font-size: 15px; font-weight: 600; color: #111827;">Additional Information</h2>
            <p style="margin: 0; font-size: 15px; color: #374151; line-height: 1.6;">Unfortunately, we are currently at capacity for the requested class. We encourage you to reapply in the future when spaces become available.</p>
          </div>
          <p style="margin: 24px 0 0 0; font-size: 15px; color: #374151; line-height: 1.6;">We appreciate your understanding and wish you and your family all the best in your search for Islamic education, inshallah.</p>
        `
        html = await generateEmailTemplate({
          title: 'Application Update',
          description: 'We wanted to update you on the status of your application.',
          orgHeaderHtml,
          content,
          footerText: `If you have any questions, please don't hesitate to contact us.`,
          showLogo: true
        })
        break
      }

      case 'payment-confirmation': {
        const amountFormatted = `£${(demoData.amount / 100).toFixed(2)}`
        const methodLabel = demoData.paymentMethod === 'CASH' ? 'Cash' 
          : demoData.paymentMethod === 'BANK_TRANSFER' ? 'Bank Transfer' 
          : demoData.paymentMethod
        const paidDateText = '29 January 2025'

        const orgHeaderHtml = createOrgHeader(demoData.orgName)
        const content = `
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
            <tr>
              <td>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding: 0 0 12px 0; font-size: 14px; color: #6b7280; text-align: left;">Student:</td>
                    <td align="right" style="padding: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #111827; text-align: right;">${demoData.studentName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 0 0 12px 0; font-size: 14px; color: #6b7280; text-align: left;">Class:</td>
                    <td align="right" style="padding: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #111827; text-align: right;">${demoData.className}</td>
                  </tr>
                  <tr>
                    <td style="padding: 0 0 12px 0; font-size: 14px; color: #6b7280; text-align: left;">Month:</td>
                    <td align="right" style="padding: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #111827; text-align: right;">${demoData.month}</td>
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
        html = await generateEmailTemplate({
          title: 'Payment Confirmation',
          description: "Assalamu'alaikum! This email confirms that your payment has been received and processed.",
          orgHeaderHtml,
          content,
          footerText: `Jazakallahu Khairan,<br>The ${demoData.orgName} Team`,
          showLogo: true,
          icon: '✓'
        })
        break
      }

      case 'payment-link': {
        const amountFormatted = `£${(demoData.amount / 100).toFixed(2)}`
        const invoiceId = 'INV-12345678'
        const orgHeaderHtml = createOrgHeader(demoData.orgName)
        const content = `
          <p style="margin: 0 0 16px 0; font-size: 15px; color: #374151; line-height: 1.6;">Assalamu'alaikum <strong>${demoData.parentName}</strong>,</p>
          <p style="margin: 0 0 24px 0; font-size: 15px; color: #374151; line-height: 1.6;">Invoice #${invoiceId.slice(-8)} for <strong>${amountFormatted}</strong> is due. Please click the button below to pay securely online.</p>
        `
        html = await generateEmailTemplate({
          title: 'Payment Due',
          description: `You have an outstanding invoice for ${amountFormatted}. Click below to pay securely.`,
          orgHeaderHtml,
          content,
          buttonText: 'Pay Now',
          buttonUrl: 'https://app.madrasah.io/pay/invoice-123',
          footerText: 'If you have any questions, please contact your madrasah administrator.',
          showLogo: true
        })
        break
      }

      case 'billing-success': {
        const amountFormatted = `£${(demoData.amount / 100).toFixed(2)}`
        const studentCount = 45
        const content = `
          <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-left: 4px solid #22c55e; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
            <p style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #166534;">Payment Successful ✓</p>
            <p style="margin: 0; font-size: 15px; color: #15803d; line-height: 1.6;">Your monthly subscription payment has been processed successfully.</p>
          </div>
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
            <tr>
              <td style="padding: 0 0 12px 0; font-size: 14px; color: #6b7280; text-align: left;">Organisation:</td>
              <td align="right" style="padding: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #111827; text-align: right;">${demoData.orgName}</td>
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
          <p style="margin: 0; font-size: 15px; color: #374151; line-height: 1.6;">Thank you for your continued support. Your account remains active and you can continue using all features.</p>
        `
        html = await generateEmailTemplate({
          title: 'Billing Successful',
          description: "Assalamu'alaikum! Your monthly subscription payment has been processed successfully.",
          content,
          buttonText: 'View Invoice',
          buttonUrl: 'https://app.madrasah.io/invoices/latest',
          footerText: 'If you have any questions about this charge, please contact our support team.',
          showLogo: true,
          icon: '✓'
        })
        break
      }

      case 'password-reset': {
        const content = `
          <p style="margin: 0 0 16px 0; font-size: 15px; color: #374151; line-height: 1.6;">You requested to reset your password for your Madrasah OS account.</p>
          <p style="margin: 0 0 24px 0; font-size: 15px; color: #374151; line-height: 1.6;">Click the button below to create a new password. This link will expire in 1 hour for security reasons.</p>
        `
        html = await generateEmailTemplate({
          title: 'Password Reset Request',
          description: 'We received a request to reset your password. Click below to continue.',
          content,
          buttonText: 'Reset Password',
          buttonUrl: demoData.resetUrl,
          footerText: "If you didn't request this, you can safely ignore this email. Your password will remain unchanged.",
          showLogo: true
        })
        break
      }

      case 'two-factor-code': {
        const code = '123456'
        const content = `
          <div style="background: #f9fafb; border: 2px dashed #d1d5db; border-radius: 12px; padding: 32px 24px; text-align: center; margin: 24px 0;">
            <div style="font-size: 42px; font-weight: 700; letter-spacing: 12px; color: #111827; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.2;">
              ${code}
            </div>
          </div>
          <p style="margin: 0 0 24px 0; font-size: 15px; color: #6b7280; line-height: 1.6;">This code will expire in <strong>10 minutes</strong>.</p>
          <div style="background: #fef3c7; border: 1px solid #fde68a; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 8px; margin-top: 24px;">
            <p style="margin: 0; font-size: 14px; color: #92400e; line-height: 1.5;">
              <strong>Security Notice:</strong> If you didn't request this code, please ignore this email or contact support if you have concerns.
            </p>
          </div>
        `
        html = await generateEmailTemplate({
          title: 'Your Verification Code',
          description: `Assalamu'alaikum ${demoData.parentName}! You're signing in to your Madrasah OS account. Use this verification code to complete your login:`,
          content,
          footerText: 'If you have any concerns about this login attempt, please contact our support team immediately.',
          showLogo: true
        })
        break
      }

      case 'parent-invite': {
        const orgHeaderHtml = createOrgHeader(demoData.orgName)
        html = await generateEmailTemplate({
          title: "Assalamu'alaikum!",
          description: `You've been invited to join <strong>${demoData.orgName}</strong> on Madrasah OS. Click below to complete your account setup.`,
          orgHeaderHtml,
          buttonText: 'Complete Setup',
          buttonUrl: demoData.inviteUrl,
          footerText: 'If you have any questions, please contact your madrasah administrator.',
          showLogo: true
        })
        break
      }

      case 'parent-onboarding': {
        const orgHeaderHtml = createOrgHeader(demoData.orgName)
        const content = `
          <p style="margin: 0 0 16px 0; font-size: 15px; color: #374151; line-height: 1.6;">We're delighted to welcome you and <strong>${demoData.studentName}</strong> to <strong>${demoData.orgName}</strong>!</p>
          <p style="margin: 0 0 24px 0; font-size: 15px; color: #374151; line-height: 1.6;">Your child's madrasah is now using <strong>Madrasah OS</strong> to enhance their Islamic education experience. Inshallah, this platform will help us work together to support your child's journey in learning the Quran and Islamic knowledge.</p>
        `
        html = await generateEmailTemplate({
          title: "Assalamu'alaikum!",
          description: 'Welcome to our madrasah! Complete your account setup to get started.',
          orgHeaderHtml,
          content,
          buttonText: 'Complete Account Setup',
          buttonUrl: demoData.signupUrl,
          footerText: `This link will expire in 7 days. If you have any questions, please contact ${demoData.orgName} directly.`,
          showLogo: true
        })
        break
      }

      case 'staff-invitation': {
        const orgHeaderHtml = createOrgHeader(demoData.orgName)
        html = await generateEmailTemplate({
          title: "You've Been Invited",
          description: `Assalamu'alaikum! You've been invited to join <strong>${demoData.orgName}</strong> as an <strong>Administrator</strong>. Click below to create your account and get started.`,
          orgHeaderHtml,
          buttonText: 'Create Account',
          buttonUrl: demoData.inviteUrl,
          footerText: 'If you have any questions, please contact your organisation administrator.',
          showLogo: true
        })
        break
      }

      case 'org-setup-invitation': {
        html = await generateEmailTemplate({
          title: 'Welcome to Madrasah OS',
          description: `Assalamu'alaikum! You've been invited to set up <strong>${demoData.orgName}</strong> on Madrasah OS. Click below to create your account and complete the setup.`,
          buttonText: 'Set Up Organisation',
          buttonUrl: demoData.inviteUrl,
          footerText: 'If you have any questions, please contact our support team.',
          showLogo: true
        })
        break
      }

      case 'org-setup-confirmation': {
        const content = `
          <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-left: 4px solid #22c55e; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
            <p style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #166534;">Setup Complete ✓</p>
            <p style="margin: 0; font-size: 15px; color: #15803d; line-height: 1.6;"><strong>${demoData.orgName}</strong> has been successfully set up on Madrasah OS.</p>
          </div>
          <p style="margin: 0 0 16px 0; font-size: 15px; color: #374151; line-height: 1.6;">You can now start using all features to manage your madrasah efficiently.</p>
        `
        html = await generateEmailTemplate({
          title: 'Organisation Setup Complete',
          description: 'Congratulations! Your organisation has been successfully set up.',
          content,
          buttonText: 'Go to Dashboard',
          buttonUrl: 'https://app.madrasah.io/dashboard',
          footerText: 'If you need help getting started, visit our support page or contact our team.',
          showLogo: true,
          icon: '✓'
        })
        break
      }

      case 'payment-failed-platform': {
        const amountText = `£${(demoData.amount / 100).toFixed(2)}`
        const content = `
          <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-left: 4px solid #dc2626; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
            <p style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #991b1b;">Payment Failed</p>
            <p style="margin: 0 0 12px 0; font-size: 15px; color: #7f1d1d; line-height: 1.6;">We were unable to process your payment for <strong>${amountText}</strong> for <strong>${demoData.orgName}</strong>.</p>
            <div style="background-color: #fee2e2; border-radius: 6px; padding: 12px; margin-top: 12px;">
              <p style="margin: 0 0 4px 0; font-size: 13px; color: #991b1b; font-weight: 600;">Reason:</p>
              <p style="margin: 0; font-size: 14px; color: #7f1d1d; line-height: 1.5;">${demoData.failureReason}</p>
            </div>
          </div>
          <p style="margin: 0 0 16px 0; font-size: 15px; color: #374151; line-height: 1.6;">Don't worry - we'll automatically retry your payment in a few days. In the meantime, you can update your payment method if needed.</p>
        `
        html = await generateEmailTemplate({
          title: 'Payment Update',
          description: "Assalamu'alaikum! We wanted to let you know that we were unable to process your monthly subscription payment. We'll automatically retry the payment in a few days.",
          content,
          buttonText: 'Update Payment Method',
          buttonUrl: demoData.updateUrl,
          footerText: 'If you have any questions or need assistance, please contact our support team.',
          showLogo: true
        })
        break
      }

      case 'payment-failed-warning': {
        const amountText = `£${(demoData.amount / 100).toFixed(2)}`
        const content = `
          <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-left: 4px solid #dc2626; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
            <p style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #991b1b;">Action Required</p>
            <p style="margin: 0 0 12px 0; font-size: 15px; color: #7f1d1d; line-height: 1.6;">We've attempted to process your payment for <strong>${amountText}</strong> for <strong>${demoData.orgName}</strong> multiple times, but were unable to complete it.</p>
            <div style="background-color: #fee2e2; border-radius: 6px; padding: 12px; margin-top: 12px;">
              <p style="margin: 0 0 4px 0; font-size: 13px; color: #991b1b; font-weight: 600;">Latest Reason:</p>
              <p style="margin: 0; font-size: 14px; color: #7f1d1d; line-height: 1.5;">${demoData.failureReason}</p>
            </div>
          </div>
          <p style="margin: 0 0 16px 0; font-size: 15px; color: #374151; line-height: 1.6;">Please update your payment method within the next 7 days to avoid any interruption to your service. Your account may be temporarily suspended if payment is not resolved.</p>
        `
        html = await generateEmailTemplate({
          title: 'Payment Action Required',
          description: "Assalamu'alaikum! We need your attention regarding your subscription payment. Please update your payment method to continue using Madrasah OS without interruption.",
          content,
          buttonText: 'Update Payment Method',
          buttonUrl: demoData.updateUrl,
          footerText: 'If you have any questions or need assistance, please contact our support team immediately.',
          showLogo: true
        })
        break
      }

      case 'support-notification': {
        const content = `
          <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
            <p style="margin: 0 0 8px 0; font-size: 13px; color: #6b7280; font-weight: 500;">Subject:</p>
            <p style="margin: 0 0 16px 0; font-size: 15px; color: #111827; font-weight: 600;">${demoData.supportSubject}</p>
            <p style="margin: 0 0 8px 0; font-size: 13px; color: #6b7280; font-weight: 500;">Message:</p>
            <div style="font-size: 15px; color: #374151; line-height: 1.6;">${demoData.supportMessage}</div>
          </div>
        `
        html = await generateEmailTemplate({
          title: 'Support Ticket Update',
          description: 'You have received an update on your support ticket.',
          content,
          footerText: 'If you need further assistance, please reply to this email or contact our support team.',
          showLogo: true
        })
        break
      }

      case 'message-announcement': {
        const orgHeaderHtml = createOrgHeader(demoData.orgName)
        const content = `
          <p style="margin: 0 0 16px 0; font-size: 15px; color: #374151; line-height: 1.6;">Assalamu'alaikum!</p>
          <p style="margin: 0 0 16px 0; font-size: 15px; color: #374151; line-height: 1.6;">We wanted to share an important update with you regarding upcoming events and schedule changes.</p>
          <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="margin: 0; font-size: 15px; color: #374151; line-height: 1.6;">Please check your dashboard for the latest announcements and updates from the madrasah.</p>
          </div>
        `
        html = await generateEmailTemplate({
          title: 'Important Announcement',
          description: 'We have an important update to share with you.',
          orgHeaderHtml,
          content,
          footerText: `Jazakallahu Khairan,<br>The ${demoData.orgName} Team`,
          showLogo: true
        })
        break
      }

      case 'gift-aid-reminder': {
        const orgHeaderHtml = createOrgHeader(demoData.orgName)
        const content = `
          <p style="margin: 0 0 16px 0; font-size: 15px; color: #374151; line-height: 1.6;">Assalamu'alaikum,</p>
          <p style="margin: 0 0 16px 0; font-size: 15px; color: #374151; line-height: 1.6;">We hope this message finds you well. We wanted to reach out regarding Gift Aid for your payments to <strong>${demoData.orgName}</strong>.</p>
          <p style="margin: 0 0 16px 0; font-size: 15px; color: #374151; line-height: 1.6;">Gift Aid allows us to claim an extra 25% from the government on your donations, at no extra cost to you. This significantly helps us continue providing quality Islamic education.</p>
          <p style="margin: 0 0 24px 0; font-size: 15px; color: #374151; line-height: 1.6;">If you haven't already, please consider completing a Gift Aid declaration form. It only takes a few minutes and makes a huge difference to our madrasah.</p>
        `
        html = await generateEmailTemplate({
          title: 'Gift Aid Reminder',
          description: 'Help us maximize the impact of your donations with Gift Aid.',
          orgHeaderHtml,
          content,
          footerText: `Jazakallahu Khairan,<br>The ${demoData.orgName} Team`,
          showLogo: true
        })
        break
      }

      case 'meeting-scheduled': {
        const orgHeaderHtml = createOrgHeader(demoData.orgName)
        const content = `
          <p style="margin: 0 0 16px 0; font-size: 15px; color: #374151; line-height: 1.6;">You have a meeting scheduled:</p>
          <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 16px 0;">
            <h2 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: #111827;">Parent-Teacher Meeting</h2>
            <p style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280;">Date: Monday, 15 January 2025</p>
            <p style="margin: 0; font-size: 14px; color: #6b7280;">Time: 2:00 PM - 3:00 PM</p>
          </div>
          <p style="margin: 16px 0 0 0; font-size: 15px; color: #374151; line-height: 1.6;">We look forward to discussing your child's progress with you.</p>
        `
        html = await generateEmailTemplate({
          title: 'Meeting Scheduled',
          description: 'You have a parent-teacher meeting scheduled.',
          orgHeaderHtml,
          content,
          footerText: `Jazakallahu Khairan,<br>The ${demoData.orgName} Team`,
          showLogo: true
        })
        break
      }

      case 'lead-initial-outreach': {
        const content = `
          <p style="margin: 0 0 16px 0; font-size: 15px; color: #374151; line-height: 1.6;">Assalamu Alaikum ${demoData.parentName},</p>
          <p style="margin: 0 0 16px 0; font-size: 15px; color: #374151; line-height: 1.6;">I hope this message finds you well.</p>
          <p style="margin: 0 0 16px 0; font-size: 15px; color: #374151; line-height: 1.6;">I'm reaching out from Madrasah OS. We help madrasahs manage students, track attendance, handle payments, and communicate with parents—all in one system.</p>
          <p style="margin: 0 0 24px 0; font-size: 15px; color: #374151; line-height: 1.6;">I noticed <strong>${demoData.orgName}</strong> and thought you might find our platform useful. Many madrasahs have found it helps them save time on administrative tasks.</p>
          <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 24px 0;">
            <h3 style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #111827;">Key Features:</h3>
            <div style="margin-bottom: 12px;">
              <p style="margin: 0 0 4px 0; font-size: 15px; font-weight: 600; color: #111827;">📋 Student Management</p>
              <p style="margin: 0; font-size: 14px; color: #6b7280; line-height: 1.5;">Complete student records, enrollment & tracking</p>
            </div>
            <div style="margin-bottom: 12px;">
              <p style="margin: 0 0 4px 0; font-size: 15px; font-weight: 600; color: #111827;">✅ Attendance Tracking</p>
              <p style="margin: 0; font-size: 14px; color: #6b7280; line-height: 1.5;">Quick daily marking with automated reports</p>
            </div>
            <div style="margin-bottom: 12px;">
              <p style="margin: 0 0 4px 0; font-size: 15px; font-weight: 600; color: #111827;">💳 Payment Management</p>
              <p style="margin: 0; font-size: 14px; color: #6b7280; line-height: 1.5;">Track fees, invoices & payment history</p>
            </div>
            <div>
              <p style="margin: 0 0 4px 0; font-size: 15px; font-weight: 600; color: #111827;">💬 Parent Communication</p>
              <p style="margin: 0; font-size: 14px; color: #6b7280; line-height: 1.5;">Send messages, announcements & updates</p>
            </div>
          </div>
          <p style="margin: 0 0 24px 0; font-size: 15px; color: #374151; line-height: 1.6;">Would you be open to a brief conversation? I'd be happy to show you how it works and answer any questions.</p>
        `
        html = await generateEmailTemplate({
          title: `Management system for ${demoData.orgName}`,
          description: 'I wanted to introduce you to Madrasah OS and how it could benefit your madrasah.',
          content,
          footerText: `JazakAllah Khair,<br>Platform Owner<br>Madrasah OS`,
          showLogo: true
        })
        break
      }

      case 'lead-follow-up-1': {
        const content = `
          <p style="margin: 0 0 16px 0; font-size: 15px; color: #374151; line-height: 1.6;">Assalamu Alaikum ${demoData.parentName},</p>
          <p style="margin: 0 0 16px 0; font-size: 15px; color: #374151; line-height: 1.6;">I hope this message finds you well.</p>
          <p style="margin: 0 0 16px 0; font-size: 15px; color: #374151; line-height: 1.6;">I wanted to follow up on my previous message about Madrasah OS and how it could benefit <strong>${demoData.orgName}</strong>.</p>
          <p style="margin: 0 0 24px 0; font-size: 15px; color: #374151; line-height: 1.6;">I understand you're busy, so I'll keep this brief. Our platform helps madrasahs save time on administrative tasks and improve communication with parents.</p>
          <p style="margin: 0 0 24px 0; font-size: 15px; color: #374151; line-height: 1.6;">If you're interested, I'd be happy to show you how it works and answer any questions.</p>
        `
        html = await generateEmailTemplate({
          title: `Following up: Management system for ${demoData.orgName}`,
          description: 'I wanted to follow up on my previous message about Madrasah OS.',
          content,
          footerText: `JazakAllah Khair,<br>Platform Owner<br>Madrasah OS`,
          showLogo: true
        })
        break
      }

      case 'lead-follow-up-2': {
        const content = `
          <p style="margin: 0 0 16px 0; font-size: 15px; color: #374151; line-height: 1.6;">Assalamu Alaikum ${demoData.parentName},</p>
          <p style="margin: 0 0 16px 0; font-size: 15px; color: #374151; line-height: 1.6;">I hope you're well.</p>
          <p style="margin: 0 0 16px 0; font-size: 15px; color: #374151; line-height: 1.6;">I wanted to reach out one more time about Madrasah OS for <strong>${demoData.orgName}</strong>.</p>
          <p style="margin: 0 0 16px 0; font-size: 15px; color: #374151; line-height: 1.6;">I know you're busy, but I believe our platform could genuinely help streamline your operations. Many madrasahs have found it helps them save time on administrative tasks.</p>
          <p style="margin: 0 0 24px 0; font-size: 15px; color: #374151; line-height: 1.6;">If you're interested, I'm here to help. If not, I completely understand and won't trouble you further.</p>
        `
        html = await generateEmailTemplate({
          title: `One more follow-up: Management system for ${demoData.orgName}`,
          description: 'I wanted to reach out one more time about how Madrasah OS could benefit your madrasah.',
          content,
          footerText: `JazakAllah Khair,<br>Platform Owner<br>Madrasah OS`,
          showLogo: true
        })
        break
      }

      case 'lead-final-follow-up': {
        const content = `
          <p style="margin: 0 0 16px 0; font-size: 15px; color: #374151; line-height: 1.6;">Assalamu Alaikum ${demoData.parentName},</p>
          <p style="margin: 0 0 16px 0; font-size: 15px; color: #374151; line-height: 1.6;">I hope this message finds you well.</p>
          <p style="margin: 0 0 16px 0; font-size: 15px; color: #374151; line-height: 1.6;">This will be my final follow-up regarding Madrasah OS for <strong>${demoData.orgName}</strong>.</p>
          <p style="margin: 0 0 16px 0; font-size: 15px; color: #374151; line-height: 1.6;">I wanted to make sure you had all the information you needed. If you're interested in learning more, please don't hesitate to reach out.</p>
          <p style="margin: 0 0 24px 0; font-size: 15px; color: #374151; line-height: 1.6;">Thank you for your time.</p>
        `
        html = await generateEmailTemplate({
          title: `Final follow-up: Management system for ${demoData.orgName}`,
          description: 'This will be my final follow-up regarding Madrasah OS.',
          content,
          footerText: `JazakAllah Khair,<br>Platform Owner<br>Madrasah OS`,
          showLogo: true
        })
        break
      }

      default:
        return NextResponse.json({ error: 'Invalid email type' }, { status: 400 })
    }

    // Replace absolute logo URLs with relative paths for preview
    const previewHtml = html.replace(
      /https?:\/\/[^"']+\/madrasah-logo\.png/g,
      '/madrasah-logo.png'
    ).replace(
      /src="https?:\/\/[^"']+"/g,
      (match) => {
        if (match.includes('madrasah-logo')) {
          return 'src="/madrasah-logo.png"'
        }
        return match
      }
    )

    return new NextResponse(previewHtml, {
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    })
  } catch (error: any) {
    logger.error('Error generating email preview', error)
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { 
        error: 'Failed to generate email preview',
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}
