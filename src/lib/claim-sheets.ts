import { QRCodeSVG } from 'qrcode.react'

/**
 * Generate claim sheet data for a student
 * Returns data that can be used to render a PDF or HTML claim sheet
 */
export interface ClaimSheetData {
  student: {
    id: string
    firstName: string
    lastName: string
    claimCode: string
  }
  org: {
    name: string
  }
  classes: Array<{
    name: string
  }>
  signupUrl: string
}

/**
 * Generate QR code data URL for claim sheet
 */
export function generateClaimQRCode(signupUrl: string): string {
  // This will be used client-side to generate QR code
  // For server-side, we'd use a library like 'qrcode'
  return signupUrl
}

/**
 * Format claim code for display (add spaces for readability)
 */
export function formatClaimCode(code: string): string {
  if (!code) return ''
  // Format as: XXXX-XXXX-XX (10 chars) or similar
  if (code.length === 10) {
    return `${code.substring(0, 4)}-${code.substring(4, 8)}-${code.substring(8)}`
  }
  return code
}

