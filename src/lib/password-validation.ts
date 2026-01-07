import { getPlatformSettings } from './platform-settings'

export interface PasswordValidationResult {
  isValid: boolean
  errors: string[]
}

/**
 * Validates a password against platform settings
 * Fetches current platform settings and validates accordingly
 */
export async function validatePassword(password: string): Promise<PasswordValidationResult> {
  const settings = await getPlatformSettings()
  const errors: string[] = []

  // Check minimum length
  if (password.length < (settings.passwordMinLength || 8)) {
    errors.push(`Password must be at least ${settings.passwordMinLength || 8} characters long`)
  }

  // Check uppercase requirement
  if (settings.passwordRequireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }

  // Check lowercase requirement
  if (settings.passwordRequireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }

  // Check numbers requirement
  if (settings.passwordRequireNumbers && !/\d/.test(password)) {
    errors.push('Password must contain at least one number')
  }

  // Check special characters requirement
  if (settings.passwordRequireSpecial && !/[^A-Za-z0-9]/.test(password)) {
    errors.push('Password must contain at least one special character')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Get password requirements for display purposes
 * Returns an array of requirement objects with their status
 */
export async function getPasswordRequirements(): Promise<Array<{
  text: string
  required: boolean
  met: (password: string) => boolean
}>> {
  const settings = await getPlatformSettings()
  const requirements: Array<{
    text: string
    required: boolean
    met: (password: string) => boolean
  }> = []

  requirements.push({
    text: `At least ${settings.passwordMinLength || 8} characters`,
    required: true,
    met: (password: string) => password.length >= (settings.passwordMinLength || 8)
  })

  if (settings.passwordRequireUppercase) {
    requirements.push({
      text: 'One uppercase letter',
      required: true,
      met: (password: string) => /[A-Z]/.test(password)
    })
  }

  if (settings.passwordRequireLowercase) {
    requirements.push({
      text: 'One lowercase letter',
      required: true,
      met: (password: string) => /[a-z]/.test(password)
    })
  }

  if (settings.passwordRequireNumbers) {
    requirements.push({
      text: 'One number',
      required: true,
      met: (password: string) => /\d/.test(password)
    })
  }

  if (settings.passwordRequireSpecial) {
    requirements.push({
      text: 'One special character',
      required: true,
      met: (password: string) => /[^A-Za-z0-9]/.test(password)
    })
  }

  return requirements
}



















