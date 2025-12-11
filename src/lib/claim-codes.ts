import crypto from 'crypto'

/**
 * Generate a unique claim code (8-12 characters alphanumeric)
 * Format: Uppercase letters and numbers, excluding ambiguous characters (0, O, I, 1)
 */
export function generateClaimCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Excludes 0, O, I, 1
  let code = ''
  
  // Generate 10 characters by default
  for (let i = 0; i < 10; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  
  return code
}

/**
 * Generate a claim code and ensure it's unique in the database
 */
export async function generateUniqueClaimCode(
  prisma: any,
  maxAttempts: number = 10
): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const code = generateClaimCode()
    
    // Check if code already exists
    const existing = await prisma.student.findUnique({
      where: { claimCode: code },
      select: { id: true }
    })
    
    if (!existing) {
      return code
    }
  }
  
  // If we've exhausted attempts, use a longer code with timestamp
  const timestamp = Date.now().toString(36).toUpperCase()
  const randomPart = generateClaimCode().substring(0, 6)
  return `${randomPart}${timestamp.substring(timestamp.length - 4)}`
}

/**
 * Generate expiration date for claim code (default: 90 days from now)
 */
export function generateClaimCodeExpiration(days: number = 90): Date {
  const expiration = new Date()
  expiration.setDate(expiration.getDate() + days)
  return expiration
}

