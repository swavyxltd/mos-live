/**
 * Input validation and sanitization utilities
 */

// Maximum file size: 10MB
export const MAX_FILE_SIZE = 10 * 1024 * 1024

// Allowed file types for CSV uploads
export const ALLOWED_CSV_TYPES = ['text/csv', 'application/vnd.ms-excel', 'text/plain']

// Maximum string lengths
export const MAX_STRING_LENGTHS = {
  name: 255,
  email: 255,
  phone: 50,
  address: 500,
  notes: 5000,
  description: 2000,
  title: 255,
  body: 10000
}

/**
 * Sanitize HTML content to prevent XSS
 */
export function sanitizeHtml(html: string): string {
  return html
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

/**
 * Sanitize plain text input
 */
export function sanitizeText(text: string, maxLength?: number): string {
  if (!text || typeof text !== 'string') {
    return ''
  }
  
  let sanitized = text.trim()
  
  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength)
  }
  
  // Remove control characters except newlines and tabs
  sanitized = sanitized.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '')
  
  return sanitized
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validate UK phone number
 * Accepts formats:
 * - +44 followed by 10 digits (without leading 0)
 * - 07 followed by 9 digits (mobile)
 * - 01/02/03 followed by 9-10 digits (landline)
 * - Can include spaces, dashes, parentheses
 */
export function isValidPhone(phone: string): boolean {
  if (!phone || typeof phone !== 'string') {
    return false
  }
  
  // Remove all spaces, dashes, parentheses, and dots for validation
  const cleaned = phone.replace(/[\s\-\(\)\.]/g, '')
  
  // UK phone number patterns:
  // +44 followed by 10 digits (international format)
  // 07 followed by 9 digits (mobile)
  // 01/02/03 followed by 9-10 digits (landline)
  
  // International format: +44 followed by 10 digits
  if (cleaned.startsWith('+44')) {
    const digits = cleaned.substring(3)
    return /^\d{10}$/.test(digits)
  }
  
  // UK mobile: 07 followed by 9 digits (total 11 digits)
  if (cleaned.startsWith('07')) {
    return /^07\d{9}$/.test(cleaned)
  }
  
  // UK landline: 01/02/03 followed by 9-10 digits (total 10-11 digits)
  if (cleaned.startsWith('01') || cleaned.startsWith('02') || cleaned.startsWith('03')) {
    return /^(01|02|03)\d{8,9}$/.test(cleaned)
  }
  
  return false
}

/**
 * Validate UK postcode
 * Formats: A9 9AA, A99 9AA, AA9 9AA, AA99 9AA, A9A 9AA, AA9A 9AA
 * Can have space or no space
 */
/**
 * Validate UK postcode
 * Formats: A9 9AA, A99 9AA, AA9 9AA, AA99 9AA, A9A 9AA, AA9A 9AA
 * Can have space or no space
 */
export function isValidUKPostcode(postcode: string): boolean {
  if (!postcode || typeof postcode !== 'string') {
    return false
  }
  
  // Remove spaces and convert to uppercase
  const cleaned = postcode.replace(/\s/g, '').toUpperCase()
  
  // UK postcode regex pattern
  // Matches: A9 9AA, A99 9AA, AA9 9AA, AA99 9AA, A9A 9AA, AA9A 9AA
  const postcodeRegex = /^[A-Z]{1,2}\d{1,2}[A-Z]?\d[A-Z]{2}$/
  
  return postcodeRegex.test(cleaned)
}

/**
 * Validate file upload
 */
export function validateFileUpload(file: File, allowedTypes?: string[], maxSize?: number): {
  valid: boolean
  error?: string
} {
  if (!file) {
    return { valid: false, error: 'No file provided' }
  }

  const fileSize = maxSize || MAX_FILE_SIZE
  if (file.size > fileSize) {
    return { 
      valid: false, 
      error: `File size exceeds maximum allowed size of ${Math.round(fileSize / 1024 / 1024)}MB` 
    }
  }

  if (allowedTypes && allowedTypes.length > 0) {
    const isValidType = allowedTypes.some(type => {
      if (type.includes('*')) {
        const baseType = type.split('/')[0]
        return file.type.startsWith(baseType)
      }
      return file.type === type
    })

    if (!isValidType) {
      return { 
        valid: false, 
        error: `File type not allowed. Allowed types: ${allowedTypes.join(', ')}` 
      }
    }
  }

  return { valid: true }
}

/**
 * Validate and sanitize common input fields
 */
export function validateAndSanitizeInput(data: Record<string, any>, schema: Record<string, { type: 'string' | 'email' | 'phone' | 'number' | 'date', maxLength?: number, required?: boolean }>): {
  valid: boolean
  sanitized: Record<string, any>
  errors: string[]
} {
  const sanitized: Record<string, any> = {}
  const errors: string[] = []

  for (const [key, config] of Object.entries(schema)) {
    const value = data[key]

    if (config.required && (value === undefined || value === null || value === '')) {
      errors.push(`${key} is required`)
      continue
    }

    if (value === undefined || value === null || value === '') {
      sanitized[key] = null
      continue
    }

    switch (config.type) {
      case 'string':
        sanitized[key] = sanitizeText(String(value), config.maxLength)
        break
      case 'email':
        const email = String(value).toLowerCase().trim()
        if (!isValidEmail(email)) {
          errors.push(`${key} is not a valid email address`)
        } else {
          sanitized[key] = email
        }
        break
      case 'phone':
        const phone = String(value).trim()
        if (!isValidPhone(phone)) {
          errors.push(`${key} is not a valid phone number`)
        } else {
          sanitized[key] = phone
        }
        break
      case 'number':
        const num = Number(value)
        if (isNaN(num)) {
          errors.push(`${key} must be a valid number`)
        } else {
          sanitized[key] = num
        }
        break
      case 'date':
        const date = new Date(value)
        if (isNaN(date.getTime())) {
          errors.push(`${key} must be a valid date`)
        } else {
          sanitized[key] = date
        }
        break
    }
  }

  return {
    valid: errors.length === 0,
    sanitized,
    errors
  }
}

