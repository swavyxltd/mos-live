'use client'

import React, { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Modal, ModalContent, ModalHeader, ModalTitle } from './ui/modal'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'

interface GenerateReportModalProps {
  isOpen: boolean
  onClose: () => void
  onGenerateReport: (month: number, year: number) => Promise<void>
  orgCreatedAt?: Date
}

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

export default function GenerateReportModal({ 
  isOpen, 
  onClose, 
  onGenerateReport,
  orgCreatedAt: propOrgCreatedAt
}: GenerateReportModalProps) {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null)
  const [orgCreatedAt, setOrgCreatedAt] = useState<Date | null>(propOrgCreatedAt ? new Date(propOrgCreatedAt) : null)
  const [isLoadingOrg, setIsLoadingOrg] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  
  const currentDate = new Date()
  const currentYear = currentDate.getFullYear()
  const currentMonth = currentDate.getMonth()
  const currentDay = currentDate.getDate()
  
  // Fetch org data if not provided
  useEffect(() => {
    if (isOpen && !orgCreatedAt && !propOrgCreatedAt) {
      setIsLoadingOrg(true)
      fetch('/api/orgs')
        .then(res => res.json())
        .then(data => {
          // Get the first active org (users typically have one active org)
          const activeOrg = Array.isArray(data) ? data.find((org: any) => org.status === 'ACTIVE') || data[0] : null
          if (activeOrg?.createdAt) {
            const createdAt = new Date(activeOrg.createdAt)
            console.log('Org created at:', createdAt.toISOString(), 'Year:', createdAt.getFullYear(), 'Month:', createdAt.getMonth())
            setOrgCreatedAt(createdAt)
          } else {
            // Fallback to app start date if no org found
            console.log('No org createdAt found, using default 2024-01-01')
            setOrgCreatedAt(new Date(2024, 0, 1))
          }
        })
        .catch((err) => {
          console.error('Error fetching org data:', err)
          // Fallback to app start date if fetch fails
          setOrgCreatedAt(new Date(2024, 0, 1))
        })
        .finally(() => {
          setIsLoadingOrg(false)
        })
    } else if (propOrgCreatedAt) {
      setOrgCreatedAt(new Date(propOrgCreatedAt))
    }
  }, [isOpen, propOrgCreatedAt])
  
  // Get org creation date or default to app start
  const orgStartDate = orgCreatedAt || new Date(2024, 0, 1)
  const orgStartYear = orgStartDate.getFullYear()
  const orgStartMonth = orgStartDate.getMonth()

  const handleYearChange = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && selectedYear > orgStartYear) {
      setSelectedYear(selectedYear - 1)
    } else if (direction === 'next' && selectedYear < currentYear) {
      setSelectedYear(selectedYear + 1)
    }
  }

  const isMonthAvailable = (month: number) => {
    // Can't select future months
    if (selectedYear > currentYear || (selectedYear === currentYear && month > currentMonth)) {
      return false
    }
    
    // Can't select current month if it's not complete (not the last day of the month)
    // Only allow months that are fully completed
    if (selectedYear === currentYear && month === currentMonth) {
      // Check if current month is complete (we're past the last day)
      const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
      if (currentDay < lastDayOfMonth) {
        return false // Month is not complete yet
      }
    }
    
    // Can't select months before org start year
    if (selectedYear < orgStartYear) {
      return false
    }
    
    // Can't select months before org was created (in the same year)
    if (selectedYear === orgStartYear && month < orgStartMonth) {
      return false
    }
    
    // If we get here, the month should be available
    // (it's in the past, complete, and after org creation)
    return true
  }
  
  // Debug: Log available months when modal opens or year changes
  useEffect(() => {
    if (isOpen && orgCreatedAt) {
      const orgStartDate = orgCreatedAt || new Date(2024, 0, 1)
      const orgStartYear = orgStartDate.getFullYear()
      const orgStartMonth = orgStartDate.getMonth()
      
      const checkMonth = (month: number) => {
        if (selectedYear > currentYear || (selectedYear === currentYear && month > currentMonth)) {
          return false
        }
        if (selectedYear === currentYear && month === currentMonth) {
          const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
          if (currentDay < lastDayOfMonth) {
            return false
          }
        }
        if (selectedYear < orgStartYear) {
          return false
        }
        if (selectedYear === orgStartYear && month < orgStartMonth) {
          return false
        }
        return true
      }
      
      console.log('Available months check:', {
        selectedYear,
        currentYear,
        currentMonth,
        currentDay,
        orgStartYear,
        orgStartMonth,
        availableMonths: monthNames.map((name, index) => ({
          month: name,
          index,
          available: checkMonth(index)
        }))
      })
    }
  }, [isOpen, selectedYear, orgCreatedAt, currentYear, currentMonth, currentDay])

  const handleMonthSelect = (month: number) => {
    if (isMonthAvailable(month)) {
      setSelectedMonth(month)
    }
  }

  const handleGenerate = async () => {
    if (selectedMonth !== null && !isGenerating) {
      setIsGenerating(true)
      try {
        await onGenerateReport(selectedMonth, selectedYear)
        onClose()
      } catch (error) {
        // Error is handled by the parent component
        console.error('Error generating report:', error)
      } finally {
        setIsGenerating(false)
      }
    }
  }

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose}
      title="Generate Monthly Report"
    >
      <div className="space-y-6">
        {/* Year Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleYearChange('prev')}
            disabled={selectedYear <= orgStartYear}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <h3 className="text-lg font-semibold">{selectedYear}</h3>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleYearChange('next')}
            disabled={selectedYear >= currentYear}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Month Grid */}
        {isLoadingOrg ? (
          <div className="text-center py-4 text-muted-foreground">Loading...</div>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {monthNames.map((month, index) => {
              const isAvailable = isMonthAvailable(index)
              const isSelected = selectedMonth === index
            
            return (
              <Button
                key={month}
                variant={isSelected ? "default" : "outline"}
                size="default"
                onClick={() => handleMonthSelect(index)}
                disabled={!isAvailable}
                className={`h-14 text-sm font-medium ${
                  !isAvailable 
                    ? 'opacity-50 cursor-not-allowed' 
                    : isSelected 
                      ? 'bg-black text-white' 
                      : 'hover:bg-accent'
                }`}
              >
                {month}
              </Button>
            )
          })}
          </div>
        )}

        {/* Selected Month Display */}
        {selectedMonth !== null && (
          <div className="text-center p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">Selected:</p>
            <p className="font-medium">
              {monthNames[selectedMonth]} {selectedYear}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end space-x-2">
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={isGenerating}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleGenerate}
            disabled={selectedMonth === null || isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              'Generate Report'
            )}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
