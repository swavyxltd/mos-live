import { getLogoUrlForEmail } from './mail-helpers'

interface FeatureCard {
  icon: string
  title: string
  description: string
}

interface EmailTemplateOptions {
  title: string
  description: string | string[]
  content?: string
  headerHtml?: string
  orgHeaderHtml?: string
  buttonText?: string
  buttonUrl?: string
  footerText?: string
  showLogo?: boolean
  features?: FeatureCard[]
  calendlyUrl?: string | null
  icon?: string
  iconBgColor?: string
}

/**
 * Generate a modern, professional email template matching the app UI design
 * Inspired by the payment required modal - clean, modern, professional
 */
export async function generateEmailTemplate({
  title,
  description,
  content,
  headerHtml,
  orgHeaderHtml,
  buttonText,
  buttonUrl,
  footerText,
  showLogo = true,
  features,
  calendlyUrl,
  icon,
  iconBgColor = '#f3f4f6'
}: EmailTemplateOptions): Promise<string> {
  const logoUrl = await getLogoUrlForEmail()
  
  // Handle description as string or array
  const descriptionHtml = Array.isArray(description)
    ? description.map(desc => `<p style="margin: 0 0 12px 0; font-size: 15px; color: #6b7280 !important; line-height: 1.6; text-align: left; max-width: 100%;">${desc}</p>`).join('')
    : `<p style="margin: 0 0 16px 0; font-size: 15px; color: #6b7280 !important; line-height: 1.6; text-align: left; max-width: 100%;">${description}</p>`
  
  // Escape button URL
  const escapedButtonUrl = buttonUrl ? buttonUrl.replace(/&/g, '&amp;') : ''
  
  // Modern button HTML - matching UI design
  const buttonHtml = buttonText && buttonUrl ? `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 16px 0 24px 0;">
      <tr>
        <td align="left" style="padding: 0;">
          <a href="${escapedButtonUrl}" style="display: inline-block; background-color: #111827; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 15px; line-height: 1.5;">
            ${buttonText}
          </a>
        </td>
      </tr>
    </table>
  ` : ''

  // Book Demo CTA Button (if Calendly URL is provided)
  const escapedCalendlyUrl = calendlyUrl ? calendlyUrl.replace(/&/g, '&amp;') : ''
  const bookDemoButtonHtml = calendlyUrl ? `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 16px 0 24px 0;">
      <tr>
        <td align="left" style="padding: 0;">
          <a href="${escapedCalendlyUrl}" style="display: inline-block; background-color: #0069ff; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 15px; line-height: 1.5;">
            Book Demo
          </a>
        </td>
      </tr>
    </table>
  ` : ''
  
  // Content HTML
  const contentHtml = content ? `
    <div style="margin: 0 0 24px 0; font-size: 15px; color: #374151 !important; line-height: 1.6; text-align: left; max-width: 100%;">
      ${content}
    </div>
  ` : ''

  // Features grid HTML (modern card design)
  const featuresHtml = features && features.length > 0 ? `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 32px 0;">
      <tr>
        <td align="left" style="padding: 0;">
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 100%;">
            ${features.map((feature, index) => `
              <tr>
                <td align="left" valign="top" style="padding: ${index < features.length - 1 ? '0 0 16px 0' : '0'};">
                  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px;">
                    <tr>
                      <td align="left" style="padding: 0 0 12px 0;">
                        <div style="font-size: 24px; line-height: 1;">${feature.icon}</div>
                      </td>
                    </tr>
                    <tr>
                      <td align="left" style="padding: 0 0 8px 0;">
                        <h3 style="margin: 0; font-size: 14px; font-weight: 600; color: #111827 !important; line-height: 1.4;">
                          ${feature.title}
                        </h3>
                      </td>
                    </tr>
                    <tr>
                      <td align="left" style="padding: 0;">
                        <p style="margin: 0; font-size: 13px; color: #6b7280 !important; line-height: 1.5;">
                          ${feature.description}
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            `).join('')}
          </table>
        </td>
      </tr>
    </table>
  ` : ''
  
  // Footer text HTML
  const footerTextHtml = footerText ? `
    <p style="margin: 32px 0 0 0; font-size: 13px; color: #9ca3af !important; line-height: 1.6; text-align: left;">
      ${footerText}
    </p>
  ` : ''
  
  // Logo HTML
  const isPreview = process.env.NODE_ENV === 'development' && logoUrl.includes('localhost')
  const logoSrc = isPreview ? '/madrasah-logo.png' : logoUrl
  
  const logoHtml = showLogo ? `
    <tr>
      <td align="center" class="email-padding" style="padding: 40px 40px 24px 40px; background-color: #ffffff !important; color: #111827 !important;">
        <img src="${logoSrc}" alt="Madrasah OS" style="max-width: 180px; height: auto; display: block;" onerror="this.style.display='none';" />
      </td>
    </tr>
  ` : ''

  // Icon HTML (if provided)
  const iconHtml = icon ? `
    <div style="width: 48px; height: 48px; background-color: ${iconBgColor}; border-radius: 10px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
      <div style="font-size: 24px; line-height: 1;">${icon}</div>
    </div>
  ` : ''

  // Header section with icon and title
  const headerSectionHtml = `
    <tr>
      <td class="email-padding" style="padding: 0 40px 16px 40px; background-color: #ffffff !important; border-bottom: 1px solid #e5e7eb; color: #111827 !important;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td align="left" style="padding: 0; background-color: #ffffff !important; color: #111827 !important;">
              ${iconHtml}
              <h1 style="margin: 0 0 8px 0; font-size: 20px; font-weight: 600; color: #111827 !important; line-height: 1.4; text-align: left;">
                ${title}
              </h1>
              ${descriptionHtml}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="color-scheme" content="light">
        <meta name="supported-color-schemes" content="light">
        <title>${title}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
          /* Force light mode - prevent dark mode in email clients */
          :root {
            color-scheme: light !important;
            supported-color-schemes: light !important;
          }
          html, body {
            color-scheme: light !important;
            background-color: #f9fafb !important;
            color: #111827 !important;
          }
          /* Override any dark mode styles */
          [data-ogsc] {
            background-color: #ffffff !important;
            color: #111827 !important;
          }
          /* Force light colors on all elements */
          * {
            background-color: inherit !important;
            color: inherit !important;
          }
          /* Mobile full-width styles */
          @media only screen and (max-width: 600px) {
            .email-wrapper {
              padding: 0 !important;
            }
            .email-container {
              max-width: 100% !important;
              width: 100% !important;
              border-radius: 0 !important;
              border-left: none !important;
              border-right: none !important;
            }
            .email-padding {
              padding-left: 20px !important;
              padding-right: 20px !important;
            }
          }
        </style>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f9fafb !important; color: #111827 !important; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" class="email-wrapper" style="padding: 40px 20px;">
          <tr>
            <td align="center">
              <!-- Main Card Container -->
              <table width="100%" cellpadding="0" cellspacing="0" class="email-container" style="background-color: #ffffff !important; border: 1px solid #e5e7eb; border-radius: 12px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); overflow: hidden; max-width: 600px; width: 100%; color: #111827 !important;">
                ${logoHtml}
                ${orgHeaderHtml ? `
                <tr>
                  <td align="center" class="email-padding" style="padding: 0 40px 24px 40px; background-color: #ffffff !important; color: #111827 !important;">
                    ${orgHeaderHtml}
                  </td>
                </tr>
                ` : ''}
                
                ${headerHtml ? `
                <tr>
                  <td class="email-padding" style="padding: 0 40px 24px 40px; background-color: #ffffff !important; color: #111827 !important;">
                    ${headerHtml}
                  </td>
                </tr>
                ` : ''}
                
                ${headerSectionHtml}
                
                <!-- Content Section -->
                <tr>
                  <td class="email-padding" style="padding: 24px 40px; background-color: #ffffff !important; color: #111827 !important;">
                    ${featuresHtml}
                    ${contentHtml}
                    ${bookDemoButtonHtml}
                    ${buttonHtml}
                    ${footerTextHtml}
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td class="email-padding" style="padding: 24px 40px; background-color: #f9fafb !important; border-top: 1px solid #e5e7eb; color: #111827 !important;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" style="padding: 0 0 12px 0;">
                          <a href="https://madrasah.io" style="font-size: 13px; color: #6b7280 !important; text-decoration: none; line-height: 1.6;">
                            madrasah.io
                          </a>
                        </td>
                      </tr>
                      <tr>
                        <td align="center" style="padding: 0;">
                          <p style="margin: 0; font-size: 12px; color: #9ca3af !important; text-align: center; line-height: 1.5;">
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
}
