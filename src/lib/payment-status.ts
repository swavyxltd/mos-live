/**
 * Calculate the due date for a payment record based on the organisation's billing day
 * @param month - Payment month in format "YYYY-MM"
 * @param billingDay - Day of month when fees are due (1-28) - from organisation settings
 * @returns Date object representing the due date
 */
export function getPaymentDueDate(month: string, billingDay: number | null): Date | null {
  if (!billingDay || billingDay < 1 || billingDay > 28) return null

  const [year, monthNum] = month.split('-').map(Number)
  // Create date for the due day of the payment month
  const dueDate = new Date(year, monthNum - 1, billingDay)
  
  // Set time to end of day (23:59:59) to ensure full day is counted
  dueDate.setHours(23, 59, 59, 999)
  
  return dueDate
}

/**
 * Calculate payment status based on due date
 * - If paid, returns 'PAID'
 * - If not paid and more than 96 hours past due date, returns 'OVERDUE'
 * - If not paid and more than 48 hours past due date, returns 'LATE'
 * - Otherwise returns 'PENDING'
 * 
 * @param currentStatus - Current payment status
 * @param month - Payment month in format "YYYY-MM"
 * @param billingDay - Day of month when fees are due (1-28)
 * @param paidAt - Date when payment was made (if paid)
 * @returns Updated payment status
 */
export function calculatePaymentStatus(
  currentStatus: string,
  month: string,
  billingDay: number | null,
  paidAt: Date | null
): string {
  // If already paid, keep as paid
  if (currentStatus === 'PAID' || paidAt) {
    return 'PAID'
  }

  // If no billing day set, keep current status
  if (!billingDay || billingDay < 1 || billingDay > 28) {
    return currentStatus
  }

  const dueDate = getPaymentDueDate(month, billingDay)
  if (!dueDate) {
    return currentStatus
  }

  const now = new Date()
  const hoursPastDue = (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60)

  // More than 96 hours (4 days) past due = OVERDUE
  if (hoursPastDue > 96) {
    return 'OVERDUE'
  }

  // More than 48 hours (2 days) past due = LATE
  if (hoursPastDue > 48) {
    return 'LATE'
  }

  // Otherwise keep as PENDING
  return 'PENDING'
}

