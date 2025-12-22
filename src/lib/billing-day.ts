/**
 * Utility functions for handling billing day
 * Billing day is set per organization by organization admins
 */

/**
 * Validates and normalizes a billing day value
 * @param value - The billing day value to validate
 * @returns A valid billing day (1-28) or null if invalid
 */
export function validateBillingDay(value: any): number | null {
  if (value === null || value === undefined) {
    return null
  }
  
  const num = Number(value)
  if (isNaN(num) || num < 1 || num > 28) {
    return null
  }
  
  return Math.floor(num)
}

/**
 * Gets the billing day from an org
 * @param org - The org object with billingDay and feeDueDay fields
 * @returns A valid billing day (1-28) or null if not set
 */
export function getBillingDay(org: { billingDay: number | null, feeDueDay: number | null }): number | null {
  // Prefer billingDay, fallback to feeDueDay, return null if neither is set
  const day = org.billingDay ?? org.feeDueDay ?? null
  return validateBillingDay(day)
}

/**
 * Prepares billing day data for database update
 * Ensures both billingDay and feeDueDay are set to the same value
 * @param value - The billing day value to set (can be null to clear)
 * @returns An object with billingDay and feeDueDay set, or null if invalid (but allows null to clear)
 */
export function prepareBillingDayUpdate(value: any): { billingDay: number | null, feeDueDay: number | null } | null {
  // Allow null/empty to clear the billing day
  if (value === null || value === undefined || value === '') {
    return {
      billingDay: null,
      feeDueDay: null
    }
  }
  
  const validated = validateBillingDay(value)
  if (validated === null) {
    return null // Invalid value (not in range 1-28)
  }
  
  return {
    billingDay: validated,
    feeDueDay: validated
  }
}

