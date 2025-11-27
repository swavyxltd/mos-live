'use client'

import { useEffect } from 'react'

interface SetOverdueBannerDataProps {
  hasOverdue: boolean
  overdueAmount: number
  overdueCount: number
}

export function SetOverdueBannerData({ hasOverdue, overdueAmount, overdueCount }: SetOverdueBannerDataProps) {
  useEffect(() => {
    // Set immediately on mount and whenever values change
    if (hasOverdue) {
      const amountStr = overdueAmount.toFixed(2)
      const countStr = overdueCount.toString()
      sessionStorage.setItem('hasOverduePayments', 'true')
      sessionStorage.setItem('overdueAmount', amountStr)
      sessionStorage.setItem('overdueCount', countStr)
      console.log('SetOverdueBannerData: Setting overdue data', { hasOverdue, overdueAmount, overdueCount, amountStr, countStr })
      // Dispatch custom event to notify banner
      window.dispatchEvent(new CustomEvent('overdueDataUpdated'))
    } else {
      sessionStorage.setItem('hasOverduePayments', 'false')
      sessionStorage.setItem('overdueAmount', '0')
      sessionStorage.setItem('overdueCount', '0')
      window.dispatchEvent(new CustomEvent('overdueDataUpdated'))
    }
  }, [hasOverdue, overdueAmount, overdueCount])

  return null
}

