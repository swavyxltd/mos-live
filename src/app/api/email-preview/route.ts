import { NextRequest, NextResponse } from 'next/server'
import { generateEmailTemplate } from '@/lib/email-template'

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

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const emailType = searchParams.get('type')

  try {
    let html = ''

    switch (emailType) {
      case 'application-submission': {
        const headerHtml = `
          <div style="max-width: 360px; margin: 8px auto 48px auto; text-align: center;">
            <div style="display: inline-block; text-align: left; border-left: 4px solid #22c55e; padding: 0 24px 0 16px;">
              <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 18px; font-weight: 700; color: #111827; margin-bottom: 2px;">
                ${demoData.orgName}
              </div>
              <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 12px; text-transform: uppercase; letter-spacing: 0.12em; color: #6b7280;">
                Official Communication
              </div>
            </div>
          </div>
        `

        const content = `
          <!-- Application Received Banner -->
          <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-left: 4px solid #22c55e; border-radius: 8px; padding: 20px; margin-bottom: 24px; text-align: center;">
            <p style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600; color: #166534;">Application Received ✓</p>
            <p style="margin: 0; font-size: 16px; color: #15803d; line-height: 1.6;">Thank you for submitting your application to <strong>${demoData.orgName}</strong></p>
          </div>
          <p style="margin: 0 0 16px 0; font-size: 16px; color: #374151; line-height: 1.6; text-align: center;">Assalamu'alaikum <strong>${demoData.parentName}</strong>,</p>
          <p style="margin: 0 0 24px 0; font-size: 16px; color: #374151; line-height: 1.6; text-align: center;">We have successfully received your application. Our team will review it and get back to you shortly, inshallah.</p>
        `
        html = await generateEmailTemplate({
          title: 'Application Received - Thank You!',
          description: '',
          headerHtml,
          content,
          footerText: `Best regards,<br>The ${demoData.orgName} Team`,
          showLogo: false
        })
        break
      }

      case 'application-acceptance': {
        const childrenList = demoData.childrenNames.length === 1 
          ? demoData.childrenNames[0]
          : demoData.childrenNames.length === 2
          ? `${demoData.childrenNames[0]} and ${demoData.childrenNames[1]}`
          : `${demoData.childrenNames.slice(0, -1).join(', ')}, and ${demoData.childrenNames[demoData.childrenNames.length - 1]}`
        
        const headerHtml = `
          <div style="max-width: 360px; margin: 8px auto 48px auto; text-align: center;">
            <div style="display: inline-block; text-align: left; border-left: 4px solid #22c55e; padding: 0 24px 0 16px;">
              <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 18px; font-weight: 700; color: #111827; margin-bottom: 2px;">
                ${demoData.orgName}
              </div>
              <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 12px; text-transform: uppercase; letter-spacing: 0.12em; color: #6b7280;">
                Official Communication
              </div>
            </div>
          </div>
        `

        const content = `
          <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-left: 4px solid #22c55e; border-radius: 8px; padding: 20px; margin-bottom: 24px; text-align: center;">
            <p style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600; color: #166534;">Alhamdulillah! 🎉</p>
            <p style="margin: 0; font-size: 16px; color: #15803d; line-height: 1.6;">We are delighted to inform you that your application has been <strong>accepted</strong>!</p>
          </div>
          <p style="margin: 0 0 16px 0; font-size: 16px; color: #374151; line-height: 1.6; text-align: center;">Assalamu'alaikum <strong>${demoData.parentName}</strong>,</p>
          <p style="margin: 0 0 24px 0; font-size: 16px; color: #374151; line-height: 1.6; text-align: center;">We are thrilled to welcome <strong>${childrenList}</strong> to <strong>${demoData.orgName}</strong>. We look forward to supporting their journey in learning the Quran and Islamic knowledge, inshallah.</p>
          <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px; margin: 32px 0; text-align: center;">
            <h2 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 600; color: #111827;">Create Your Parent Account</h2>
            <p style="margin: 0 0 24px 0; font-size: 15px; color: #6b7280; line-height: 1.6;">Sign up for a free account to stay connected with your child's education and access all our features.</p>
          </div>
          <div style="margin: 32px 0;">
            <h2 style="margin: 0 0 20px 0; font-size: 18px; font-weight: 600; color: #111827; text-align: center;">
              Why Sign Up? Here's What You'll Get:
            </h2>
            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
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
                  <p style="margin: 0; font-size: 13px; color: #6b7280; line-height: 1.5;">Receive announcements and updates from the madrasah</p>
                </td>
              </tr>
            </table>
          </div>
        `
        html = await generateEmailTemplate({
          title: 'Application Accepted - Alhamdulillah!',
          description: '',
          headerHtml,
          content,
          buttonText: 'Sign Up Now',
          buttonUrl: demoData.signupUrl,
          footerText: `If you have any questions, please don't hesitate to contact us. We're here to help!`,
          showLogo: false
        })
        break
      }

      case 'payment-confirmation': {
        const amountFormatted = `£${(demoData.amount / 100).toFixed(2)}`
        const methodLabel = demoData.paymentMethod === 'CASH' ? 'Cash' 
          : demoData.paymentMethod === 'BANK_TRANSFER' ? 'Bank Transfer' 
          : demoData.paymentMethod

        const headerHtml = `
          <div style="max-width: 360px; margin: 8px auto 48px auto; text-align: center;">
            <div style="display: inline-block; text-align: left; border-left: 4px solid #22c55e; padding: 0 24px 0 16px;">
              <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 18px; font-weight: 700; color: #111827; margin-bottom: 2px;">
                ${demoData.orgName}
              </div>
              <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 12px; text-transform: uppercase; letter-spacing: 0.12em; color: #6b7280;">
                Official Communication
              </div>
            </div>
          </div>
        `

        const paidDateText = '29 January 2025'

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
            <p style="margin: 0; font-size: 16px; font-weight: 600; color: #166534; text-align: center;">Jazakallahu Khairan</p>
            <p style="margin: 8px 0 0 0; font-size: 14px; color: #15803d; text-align: center;">Thank you for your payment. We appreciate your continued support.</p>
          </div>
        `
        html = await generateEmailTemplate({
          title: 'Payment Confirmation',
          description: "Assalamu'alaikum! This email confirms that your payment has been received and processed.",
          headerHtml,
          content,
          showLogo: false
        })
        break
      }

      case 'password-reset': {
        html = await generateEmailTemplate({
          title: 'Password Reset Request',
          description: 'You requested to reset your password. Click the button below to continue.',
          buttonText: 'Reset Password',
          buttonUrl: demoData.resetUrl,
          footerText: "If you didn't request this, you can safely ignore this email."
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
          <p style="margin: 0 0 24px 0; font-size: 14px; color: #6b7280; line-height: 1.6; text-align: center;">
            This code will expire in <strong>10 minutes</strong>.
          </p>
          <div style="background: #fef3c7; border: 1px solid #fde68a; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 8px; margin-top: 24px;">
            <p style="margin: 0; font-size: 13px; color: #92400e; line-height: 1.5;">
              <strong>Security Notice:</strong> If you didn't request this code, please ignore this email or contact support if you have concerns.
            </p>
          </div>
        `
        html = await generateEmailTemplate({
          title: 'Your Verification Code',
          description: `Assalamu'alaikum ${demoData.parentName}!<br><br>You're signing in to your Madrasah OS account. Use this verification code to complete your login:`,
          content,
          showLogo: false
        })
        break
      }

      case 'parent-invite': {
        const content = `
          <div style="max-width: 360px; margin: 0 0 24px 0; text-align: left;">
            <div style="border-left: 4px solid #22c55e; padding-left: 12px;">
              <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 18px; font-weight: 700; color: #111827; margin-bottom: 2px;">
                ${demoData.orgName}
              </div>
              <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 12px; text-transform: uppercase; letter-spacing: 0.12em; color: #6b7280;">
                Official Communication
              </div>
            </div>
          </div>
        `
        html = await generateEmailTemplate({
          title: "Assalamu'alaikum!",
          description: `You've been invited to join <strong>${demoData.orgName}</strong> on Madrasah OS. Click below to complete your account setup.`,
          content,
          buttonText: 'Complete Setup',
          buttonUrl: demoData.inviteUrl,
          footerText: 'If you have any questions, please contact your madrasah administrator.',
          showLogo: false
        })
        break
      }

      case 'parent-onboarding': {
        const content = `
          <div style="max-width: 360px; margin: 0 0 24px 0; text-align: left;">
            <div style="border-left: 4px solid #22c55e; padding-left: 12px;">
              <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 18px; font-weight: 700; color: #111827; margin-bottom: 2px;">
                ${demoData.orgName}
              </div>
              <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 12px; text-transform: uppercase; letter-spacing: 0.12em; color: #6b7280;">
                Parent Communication
              </div>
            </div>
          </div>
          <p style="margin: 0 0 16px 0; font-size: 16px; color: #374151; line-height: 1.6; text-align: center;">We're delighted to welcome you and <strong>${demoData.studentName}</strong> to <strong>${demoData.orgName}</strong>!</p>
          <p style="margin: 0 0 24px 0; font-size: 16px; color: #374151; line-height: 1.6; text-align: center;">Your child's madrasah is now using <strong>Madrasah OS</strong> to enhance their Islamic education experience. Inshallah, this platform will help us work together to support your child's journey in learning the Quran and Islamic knowledge.</p>
        `
        html = await generateEmailTemplate({
          title: "Assalamu'alaikum!",
          description: '',
          content,
          buttonText: 'Complete Account Setup',
          buttonUrl: demoData.signupUrl,
          footerText: `This link will expire in 7 days. If you have any questions, please contact ${demoData.orgName} directly.`,
          showLogo: false
        })
        break
      }

      case 'staff-invitation': {
        html = await generateEmailTemplate({
          title: "You've Been Invited",
          description: [
            "Assalamu'alaikum!",
            `You've been invited to join <strong>${demoData.orgName}</strong> as a <strong>Administrator</strong>. Click below to create your account and get started.`
          ],
          buttonText: 'Create Account',
          buttonUrl: demoData.inviteUrl
        })
        break
      }

      case 'org-setup-invitation': {
        html = await generateEmailTemplate({
          title: 'Welcome to Madrasah OS',
          description: [
            "Assalamu'alaikum!",
            `You've been invited to set up <strong>${demoData.orgName}</strong> on Madrasah OS. Click below to create your account and complete the setup.`
          ],
          buttonText: 'Set Up Organisation',
          buttonUrl: demoData.inviteUrl
        })
        break
      }

      case 'org-setup-confirmation': {
        html = await generateEmailTemplate({
          title: 'Organisation Setup Complete',
          description: `<strong>${demoData.orgName}</strong> has been successfully set up on Madrasah OS. You can now start using all features.`,
          buttonText: 'Go to Dashboard',
          buttonUrl: 'https://app.madrasah.io/dashboard',
          footerText: 'If you need help getting started, visit our support page or contact our team.'
        })
        break
      }

      case 'payment-failed-platform': {
        const amountText = `£${(demoData.amount / 100).toFixed(2)}`
        const content = `
          <div style="margin-bottom: 24px;">
            <p style="margin: 0 0 16px 0; font-size: 16px; color: #374151; line-height: 1.6; text-align: center;">We were unable to process your payment for <strong>${amountText}</strong> for <strong>${demoData.orgName}</strong>.</p>
            <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-left: 4px solid #dc2626; border-radius: 8px; padding: 16px; margin: 16px 0;">
              <p style="margin: 0 0 8px 0; font-size: 14px; color: #991b1b; font-weight: 600; text-align: center;">Reason:</p>
              <p style="margin: 0; font-size: 14px; color: #7f1d1d; line-height: 1.6; text-align: center;">${demoData.failureReason}</p>
            </div>
            <p style="margin: 16px 0 0 0; font-size: 16px; color: #374151; line-height: 1.6; text-align: center;">Don't worry - we'll automatically retry your payment in a few days. In the meantime, you can update your payment method if needed.</p>
          </div>
        `
        html = await generateEmailTemplate({
          title: 'Payment Update',
          description: [
            "Assalamu'alaikum!",
            'We wanted to let you know that we were unable to process your monthly subscription payment. We\'ll automatically retry the payment in a few days.'
          ],
          content,
          buttonText: 'Update Payment Method',
          buttonUrl: demoData.updateUrl,
          footerText: 'If you have any questions or need assistance, please contact our support team.'
        })
        break
      }

      case 'payment-failed-warning': {
        const amountText = `£${(demoData.amount / 100).toFixed(2)}`
        const content = `
          <div style="margin-bottom: 24px;">
            <p style="margin: 0 0 16px 0; font-size: 16px; color: #374151; line-height: 1.6; text-align: center;">We've attempted to process your payment for <strong>${amountText}</strong> for <strong>${demoData.orgName}</strong> multiple times, but were unable to complete it.</p>
            <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-left: 4px solid #dc2626; border-radius: 8px; padding: 16px; margin: 16px 0;">
              <p style="margin: 0 0 8px 0; font-size: 14px; color: #991b1b; font-weight: 600; text-align: center;">Latest Reason:</p>
              <p style="margin: 0; font-size: 14px; color: #7f1d1d; line-height: 1.6; text-align: center;">${demoData.failureReason}</p>
            </div>
            <p style="margin: 16px 0 0 0; font-size: 16px; color: #374151; line-height: 1.6; text-align: center;">Please update your payment method within the next 7 days to avoid any interruption to your service. Your account may be temporarily suspended if payment is not resolved.</p>
          </div>
        `
        html = await generateEmailTemplate({
          title: 'Payment Action Required',
          description: [
            "Assalamu'alaikum!",
            'We need your attention regarding your subscription payment. Please update your payment method to continue using Madrasah OS without interruption.'
          ],
          content,
          buttonText: 'Update Payment Method',
          buttonUrl: demoData.updateUrl,
          footerText: 'If you have any questions or need assistance, please contact our support team immediately.'
        })
        break
      }

      case 'support-notification': {
        const content = `
          <div style="margin-bottom: 16px;">
            <p style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280; font-weight: 500;">Subject:</p>
            <p style="margin: 0 0 16px 0; font-size: 16px; color: #111827; font-weight: 600;">${demoData.supportSubject}</p>
          </div>
          <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-top: 16px;">
            <p style="margin: 0; font-size: 14px; color: #6b7280; font-weight: 500; margin-bottom: 8px;">Message:</p>
            <div style="font-size: 15px; color: #374151; line-height: 1.6;">${demoData.supportMessage}</div>
          </div>
        `
        html = await generateEmailTemplate({
          title: 'Support Ticket Update',
          description: 'You have received an update on your support ticket.',
          content
        })
        break
      }

      case 'message-announcement': {
        const content = `
          <div style="max-width: 360px; margin: 0 0 24px 0; text-align: left;">
            <div style="border-left: 4px solid #22c55e; padding-left: 12px;">
              <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 18px; font-weight: 700; color: #111827; margin-bottom: 2px;">
                ${demoData.orgName}
              </div>
              <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 12px; text-transform: uppercase; letter-spacing: 0.12em; color: #6b7280;">
                Important Announcement
              </div>
            </div>
          </div>
        `
        html = await generateEmailTemplate({
          title: 'Important Announcement',
          description: 'Assalamu\'alaikum! We wanted to share an important update with you regarding upcoming events and schedule changes.',
          content,
          footerText: 'Best regards, The Madrasah Team',
          showLogo: false
        })
        break
      }

      case 'gift-aid-reminder': {
        const content = `
          <div style="max-width: 360px; margin: 0 0 24px 0; text-align: left;">
            <div style="border-left: 4px solid #22c55e; padding-left: 12px;">
              <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 18px; font-weight: 700; color: #111827; margin-bottom: 2px;">
                ${demoData.orgName}
              </div>
              <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 12px; text-transform: uppercase; letter-spacing: 0.12em; color: #6b7280;">
                Gift Aid Reminder
              </div>
            </div>
          </div>
          <p style="margin: 0 0 16px 0; font-size: 16px; color: #374151; line-height: 1.6; text-align: center;">
            Assalamu'alaikum,
          </p>
          <p style="margin: 0 0 16px 0; font-size: 16px; color: #374151; line-height: 1.6; text-align: center;">
            We hope this message finds you well. We wanted to reach out regarding Gift Aid for your payments to <strong>${demoData.orgName}</strong>.
          </p>
          <p style="margin: 0 0 16px 0; font-size: 16px; color: #374151; line-height: 1.6; text-align: center;">
            Gift Aid allows us to claim an extra 25% from the government on your donations, at no extra cost to you. This significantly helps us continue providing quality Islamic education.
          </p>
          <p style="margin: 0 0 16px 0; font-size: 16px; color: #374151; line-height: 1.6; text-align: center;">
            If you haven't already, please consider completing a Gift Aid declaration form. It only takes a few minutes and makes a huge difference to our madrasah.
          </p>
        `
        html = await generateEmailTemplate({
          title: 'Gift Aid Reminder',
          description: '',
          content,
          footerText: `Best regards,<br>The ${demoData.orgName} Team`,
          showLogo: false
        })
        break
      }

      case 'meeting-scheduled': {
        const content = `
          <div style="max-width: 360px; margin: 0 0 24px 0; text-align: left;">
            <div style="border-left: 4px solid #22c55e; padding-left: 12px;">
              <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 18px; font-weight: 700; color: #111827; margin-bottom: 2px;">
                ${demoData.orgName}
              </div>
              <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 12px; text-transform: uppercase; letter-spacing: 0.12em; color: #6b7280;">
                Official Communication
              </div>
            </div>
          </div>
          <p style="margin: 0 0 16px 0; font-size: 16px; color: #374151; line-height: 1.6; text-align: center;">
            You have a meeting scheduled:
          </p>
          <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 24px 0;">
            <h2 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 600; color: #111827; text-align: center;">Parent-Teacher Meeting</h2>
            <p style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280; text-align: center;">Date: Monday, 15 January 2025</p>
            <p style="margin: 0; font-size: 14px; color: #6b7280; text-align: center;">Time: 2:00 PM - 3:00 PM</p>
          </div>
          <p style="margin: 0 0 16px 0; font-size: 16px; color: #374151; line-height: 1.6; text-align: center;">
            We look forward to discussing your child's progress with you.
          </p>
        `
        html = await generateEmailTemplate({
          title: 'Meeting Scheduled: Parent-Teacher Meeting',
          description: '',
          content,
          footerText: 'Best regards, The Madrasah Team',
          showLogo: false
        })
        break
      }

      case 'lead-initial-outreach': {
        const content = `
          <p style="margin: 0 0 20px 0; font-size: 16px; color: #374151; line-height: 1.6; text-align: center;">Assalamu Alaikum ${demoData.parentName},</p>
          
          <p style="margin: 0 0 20px 0; font-size: 16px; color: #374151; line-height: 1.6; text-align: center;">I hope this message finds you well.</p>
          
          <p style="margin: 0 0 20px 0; font-size: 16px; color: #374151; line-height: 1.6; text-align: center;">I'm reaching out from Madrasah OS. We help madrasahs manage students, track attendance, handle payments, and communicate with parents—all in one system.</p>
          
          <p style="margin: 0 0 20px 0; font-size: 16px; color: #374151; line-height: 1.6; text-align: center;">I noticed <strong>${demoData.orgName}</strong> and thought you might find our platform useful. Many madrasahs have found it helps them save time on administrative tasks.</p>
          
          <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px; margin: 24px 0;">
            <h3 style="margin: 0 0 20px 0; font-size: 18px; font-weight: 600; color: #111827; text-align: center;">Our best features:</h3>
            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb; width: 50%; padding-right: 16px;">
                  <div style="font-size: 20px; margin-bottom: 4px;">📋</div>
                  <div style="font-size: 15px; font-weight: 600; color: #111827;">Student Management</div>
                  <div style="font-size: 14px; color: #6b7280; margin-top: 4px;">Complete student records, enrollment & tracking</div>
                </td>
                <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; width: 50%; padding-left: 16px;">
                  <div style="font-size: 20px; margin-bottom: 4px;">✅</div>
                  <div style="font-size: 15px; font-weight: 600; color: #111827;">Attendance Tracking</div>
                  <div style="font-size: 14px; color: #6b7280; margin-top: 4px;">Quick daily marking with automated reports</div>
                </td>
              </tr>
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb; padding-right: 16px;">
                  <div style="font-size: 20px; margin-bottom: 4px;">💳</div>
                  <div style="font-size: 15px; font-weight: 600; color: #111827;">Payment Management</div>
                  <div style="font-size: 14px; color: #6b7280; margin-top: 4px;">Track fees, invoices & payment history</div>
                </td>
                <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; padding-left: 16px;">
                  <div style="font-size: 20px; margin-bottom: 4px;">💬</div>
                  <div style="font-size: 15px; font-weight: 600; color: #111827;">Parent Communication</div>
                  <div style="font-size: 14px; color: #6b7280; margin-top: 4px;">Send messages, announcements & updates</div>
                </td>
              </tr>
              <tr>
                <td style="padding: 12px 0; border-right: 1px solid #e5e7eb; padding-right: 16px;">
                  <div style="font-size: 20px; margin-bottom: 4px;">📊</div>
                  <div style="font-size: 15px; font-weight: 600; color: #111827;">Reports & Analytics</div>
                  <div style="font-size: 14px; color: #6b7280; margin-top: 4px;">Insights on attendance, payments & performance</div>
                </td>
                <td style="padding: 12px 0; padding-left: 16px;">
                  <div style="font-size: 20px; margin-bottom: 4px;">📅</div>
                  <div style="font-size: 15px; font-weight: 600; color: #111827;">Calendar & Events</div>
                  <div style="font-size: 14px; color: #6b7280; margin-top: 4px;">Manage holidays, events & schedules</div>
                </td>
              </tr>
            </table>
          </div>
          
          <p style="margin: 0 0 24px 0; font-size: 16px; color: #374151; line-height: 1.6; text-align: center;">Would you be open to a brief conversation? I'd be happy to show you how it works and answer any questions.</p>
        `
        html = await generateEmailTemplate({
          title: `Management system for ${demoData.orgName}`,
          description: '',
          content,
          footerText: `JazakAllah Khair,<br>Platform Owner<br>Madrasah OS`
        })
        break
      }

      case 'lead-follow-up-1': {
        const content = `
          <p style="margin: 0 0 20px 0; font-size: 16px; color: #374151; line-height: 1.6; text-align: center;">Assalamu Alaikum ${demoData.parentName},</p>
          
          <p style="margin: 0 0 20px 0; font-size: 16px; color: #374151; line-height: 1.6; text-align: center;">I hope this message finds you well.</p>
          
          <p style="margin: 0 0 20px 0; font-size: 16px; color: #374151; line-height: 1.6; text-align: center;">I wanted to follow up on my previous message about Madrasah OS and how it could benefit <strong>${demoData.orgName}</strong>.</p>
          
          <p style="margin: 0 0 20px 0; font-size: 16px; color: #374151; line-height: 1.6; text-align: center;">I understand you're busy, so I'll keep this brief. Our platform helps madrasahs:</p>
          
          <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px; margin: 24px 0;">
            <h3 style="margin: 0 0 20px 0; font-size: 18px; font-weight: 600; color: #111827; text-align: center;">Our best features:</h3>
            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb; width: 50%; padding-right: 16px;">
                  <div style="font-size: 20px; margin-bottom: 4px;">📋</div>
                  <div style="font-size: 15px; font-weight: 600; color: #111827;">Student Management</div>
                  <div style="font-size: 14px; color: #6b7280; margin-top: 4px;">Complete student records, enrollment & tracking</div>
                </td>
                <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; width: 50%; padding-left: 16px;">
                  <div style="font-size: 20px; margin-bottom: 4px;">✅</div>
                  <div style="font-size: 15px; font-weight: 600; color: #111827;">Attendance Tracking</div>
                  <div style="font-size: 14px; color: #6b7280; margin-top: 4px;">Quick daily marking with automated reports</div>
                </td>
              </tr>
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb; padding-right: 16px;">
                  <div style="font-size: 20px; margin-bottom: 4px;">💳</div>
                  <div style="font-size: 15px; font-weight: 600; color: #111827;">Payment Management</div>
                  <div style="font-size: 14px; color: #6b7280; margin-top: 4px;">Track fees, invoices & payment history</div>
                </td>
                <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; padding-left: 16px;">
                  <div style="font-size: 20px; margin-bottom: 4px;">💬</div>
                  <div style="font-size: 15px; font-weight: 600; color: #111827;">Parent Communication</div>
                  <div style="font-size: 14px; color: #6b7280; margin-top: 4px;">Send messages, announcements & updates</div>
                </td>
              </tr>
              <tr>
                <td style="padding: 12px 0; border-right: 1px solid #e5e7eb; padding-right: 16px;">
                  <div style="font-size: 20px; margin-bottom: 4px;">📊</div>
                  <div style="font-size: 15px; font-weight: 600; color: #111827;">Reports & Analytics</div>
                  <div style="font-size: 14px; color: #6b7280; margin-top: 4px;">Insights on attendance, payments & performance</div>
                </td>
                <td style="padding: 12px 0; padding-left: 16px;">
                  <div style="font-size: 20px; margin-bottom: 4px;">📅</div>
                  <div style="font-size: 15px; font-weight: 600; color: #111827;">Calendar & Events</div>
                  <div style="font-size: 14px; color: #6b7280; margin-top: 4px;">Manage holidays, events & schedules</div>
                </td>
              </tr>
            </table>
          </div>
          
          <p style="margin: 0 0 24px 0; font-size: 16px; color: #374151; line-height: 1.6; text-align: center;">If you're interested, I'd be happy to show you how it works and answer any questions.</p>
          
          <p style="margin: 0 0 24px 0; font-size: 16px; color: #374151; line-height: 1.6; text-align: center;">Looking forward to hearing from you.</p>
        `
        html = await generateEmailTemplate({
          title: `Following up: Management system for ${demoData.orgName}`,
          description: '',
          content,
          footerText: `JazakAllah Khair,<br>Platform Owner<br>Madrasah OS`
        })
        break
      }

      case 'lead-follow-up-2': {
        const content = `
          <p style="margin: 0 0 20px 0; font-size: 16px; color: #374151; line-height: 1.6; text-align: center;">Assalamu Alaikum ${demoData.parentName},</p>
          
          <p style="margin: 0 0 20px 0; font-size: 16px; color: #374151; line-height: 1.6; text-align: center;">I hope you're well.</p>
          
          <p style="margin: 0 0 20px 0; font-size: 16px; color: #374151; line-height: 1.6; text-align: center;">I wanted to reach out one more time about Madrasah OS for <strong>${demoData.orgName}</strong>.</p>
          
          <p style="margin: 0 0 20px 0; font-size: 16px; color: #374151; line-height: 1.6; text-align: center;">I know you're busy, but I believe our platform could genuinely help streamline your operations. Many madrasahs have found it helps them save time on administrative tasks.</p>
          
          <p style="margin: 0 0 24px 0; font-size: 16px; color: #374151; line-height: 1.6; text-align: center;">If you're interested, I'm here to help. If not, I completely understand and won't trouble you further.</p>
        `
        html = await generateEmailTemplate({
          title: `One more follow-up: Management system for ${demoData.orgName}`,
          description: '',
          content,
          footerText: `JazakAllah Khair,<br>Platform Owner<br>Madrasah OS`
        })
        break
      }

      case 'lead-final-follow-up': {
        const content = `
          <p style="margin: 0 0 20px 0; font-size: 16px; color: #374151; line-height: 1.6; text-align: center;">Assalamu Alaikum ${demoData.parentName},</p>
          
          <p style="margin: 0 0 20px 0; font-size: 16px; color: #374151; line-height: 1.6; text-align: center;">I hope this message finds you well.</p>
          
          <p style="margin: 0 0 20px 0; font-size: 16px; color: #374151; line-height: 1.6; text-align: center;">This will be my final follow-up regarding Madrasah OS for <strong>${demoData.orgName}</strong>.</p>
          
          <p style="margin: 0 0 20px 0; font-size: 16px; color: #374151; line-height: 1.6; text-align: center;">I wanted to make sure you had all the information you needed. If you're interested in learning more, please don't hesitate to reach out.</p>
          
          <p style="margin: 0 0 24px 0; font-size: 16px; color: #374151; line-height: 1.6; text-align: center;">Thank you for your time.</p>
        `
        html = await generateEmailTemplate({
          title: `Final follow-up: Management system for ${demoData.orgName}`,
          description: '',
          content,
          footerText: `JazakAllah Khair,<br>Platform Owner<br>Madrasah OS`
        })
        break
      }

      default:
        return NextResponse.json({ error: 'Invalid email type' }, { status: 400 })
    }

    // Replace absolute logo URLs with relative paths for preview
    // This ensures the logo loads correctly in the browser preview
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
      },
    })
  } catch (error: any) {
    console.error('Error generating email preview:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
