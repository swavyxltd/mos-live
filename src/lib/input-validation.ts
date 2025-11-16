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
 * Validate phone number (basic validation)
 */
export function isValidPhone(phone: string): boolean {
  // Allow international format: +, digits, spaces, dashes, parentheses
  const phoneRegex = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/
  return phoneRegex.test(phone.replace(/\s/g, ''))
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

