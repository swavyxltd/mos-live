import { getLogoUrlForEmail } from './mail-helpers'

interface EmailTemplateOptions {
  title: string
  description: string | string[]
  content?: string
  buttonText?: string
  buttonUrl?: string
  footerText?: string
  showLogo?: boolean
}

/**
 * Generate a unified email template matching the auth page design
 */
export async function generateEmailTemplate({
  title,
  description,
  content,
  buttonText,
  buttonUrl,
  footerText,
  showLogo = true
}: EmailTemplateOptions): Promise<string> {
  const logoUrl = await getLogoUrlForEmail()
  
  // Handle description as string or array
  const descriptionHtml = Array.isArray(description)
    ? description.map(desc => `<p style="margin: 0 0 12px 0; font-size: 16px; color: #6b7280; line-height: 1.6; text-align: center; max-width: 480px; margin-left: auto; margin-right: auto;">${desc}</p>`).join('')
    : `<p style="margin: 0 0 24px 0; font-size: 16px; color: #6b7280; line-height: 1.6; text-align: center; max-width: 480px; margin-left: auto; margin-right: auto;">${description}</p>`
  
  // Escape button URL
  const escapedButtonUrl = buttonUrl ? buttonUrl.replace(/&/g, '&amp;') : ''
  
  // Button HTML
  const buttonHtml = buttonText && buttonUrl ? `
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding: 0 0 40px 0;">
          <a href="${escapedButtonUrl}" style="display: inline-block; background-color: #111827; color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-weight: 600; font-size: 16px;">
            ${buttonText}
          </a>
        </td>
      </tr>
    </table>
  ` : ''
  
  // Content HTML
  const contentHtml = content ? `
    <div style="margin: 0 0 40px 0; font-size: 16px; color: #374151; line-height: 1.6; text-align: left; max-width: 480px; margin-left: auto; margin-right: auto;">
      ${content}
    </div>
  ` : ''
  
  // Footer text HTML
  const footerTextHtml = footerText ? `
    <p style="margin: 0 0 40px 0; font-size: 14px; color: #9ca3af; line-height: 1.6; text-align: center;">
      ${footerText}
    </p>
  ` : ''
  
  // Logo HTML
  const logoHtml = showLogo ? `
    <tr>
      <td align="center" style="padding: 48px 40px 32px 40px;">
        <img src="${logoUrl}" alt="Madrasah OS" style="max-width: 198px; height: auto; display: block;" />
      </td>
    </tr>
  ` : ''
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
      </head>
      <body style="margin: 0; padding: 0; background-color: transparent; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="padding: 60px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); overflow: hidden; max-width: 600px;">
                ${logoHtml}
                
                <!-- Content -->
                <tr>
                  <td align="center" style="padding: 0 40px 48px 40px;">
                    <h1 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 600; color: #111827; line-height: 1.4; text-align: center;">
                      ${title}
                    </h1>
                    ${descriptionHtml}
                    ${contentHtml}
                    ${buttonHtml}
                    ${footerTextHtml}
                    
                    <!-- Divider -->
                    ${(buttonHtml || contentHtml) ? `
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" style="padding: 0 0 40px 0;">
                          <div style="border-top: 1px solid #e5e7eb; width: 100%; max-width: 520px;"></div>
                        </td>
                      </tr>
                    </table>
                    ` : ''}
                    
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
                            © Madrasah OS. All rights reserved.
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

