import { NextResponse } from 'next/server'
import { generateEmailTemplate } from '@/lib/email-template'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const orgName = 'Example Madrasah'
    const amount = 2500 // £25.00 in pence
    const amountText = `£${(amount / 100).toFixed(2)}`
    const failureReason = 'Your card was declined'
    const updateUrl = `${process.env.APP_BASE_URL || 'https://app.madrasah.io'}/settings?tab=subscription`
    
    const content = `
      <div style="margin-bottom: 24px;">
        <p style="margin: 0 0 16px 0; font-size: 16px; color: #374151; line-height: 1.6; text-align: center;">
          We were unable to process your payment for <strong>${amountText}</strong> for <strong>${orgName}</strong>.
        </p>
        <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-left: 4px solid #dc2626; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="margin: 0 0 8px 0; font-size: 14px; color: #991b1b; font-weight: 600; text-align: center;">Reason:</p>
          <p style="margin: 0; font-size: 14px; color: #7f1d1d; line-height: 1.6; text-align: center;">
            ${failureReason}
          </p>
        </div>
        <p style="margin: 16px 0 0 0; font-size: 16px; color: #374151; line-height: 1.6; text-align: center;">
          Don't worry - we'll automatically retry your payment in a few days. In the meantime, you can update your payment method if needed.
        </p>
      </div>
    `
    
    const emailHtml = await generateEmailTemplate({
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
    
    // Replace absolute URLs with relative paths for preview (so logo loads locally)
    const previewHtml = emailHtml.replace(
      /https?:\/\/[^"']+(\/madrasah-logo\.png)/g,
      '/madrasah-logo.png'
    )
    
    return new NextResponse(previewHtml, {
      headers: {
        'Content-Type': 'text/html',
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new NextResponse(`Error: ${message}`, {
      status: 500,
      headers: {
        'Content-Type': 'text/plain',
      },
    })
  }
}

