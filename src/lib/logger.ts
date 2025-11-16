/**
 * Centralized logging utility that filters sensitive data in production
 */

const isDevelopment = process.env.NODE_ENV === 'development'

interface LogContext {
  [key: string]: any
}

function sanitizeData(data: any): any {
  if (!data || typeof data !== 'object') {
    return data
  }

  const sensitiveKeys = [
    'password',
    'token',
    'secret',
    'apiKey',
    'authorization',
    'cookie',
    'session',
    'email', // Can be sensitive in some contexts
    'phone',
    'creditCard',
    'ssn',
    'cvv'
  ]

  if (Array.isArray(data)) {
    return data.map(item => sanitizeData(item))
  }

  const sanitized: any = {}
  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase()
    const isSensitive = sensitiveKeys.some(sk => lowerKey.includes(sk))
    
    if (isSensitive && !isDevelopment) {
      sanitized[key] = '[REDACTED]'
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeData(value)
    } else {
      sanitized[key] = value
    }
  }

  return sanitized
}

export const logger = {
  log: (...args: any[]) => {
    if (isDevelopment) {
      console.log(...args)
    }
  },

  error: (message: string, error?: any, context?: LogContext) => {
    const sanitizedContext = context ? sanitizeData(context) : undefined
    const sanitizedError = error ? {
      message: error?.message,
      stack: isDevelopment ? error?.stack : undefined,
      ...sanitizeData(error)
    } : undefined

    console.error(message, sanitizedError, sanitizedContext)
  },

  warn: (message: string, context?: LogContext) => {
    if (isDevelopment) {
      console.warn(message, context ? sanitizeData(context) : undefined)
    }
  },

  info: (message: string, context?: LogContext) => {
    if (isDevelopment) {
      console.info(message, context ? sanitizeData(context) : undefined)
    }
  },

  debug: (message: string, context?: LogContext) => {
    if (isDevelopment) {
      console.debug(message, context ? sanitizeData(context) : undefined)
    }
  }
}

