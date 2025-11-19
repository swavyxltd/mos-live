'use client'

import React, { useState } from 'react'
import { Button } from './ui/button'
import { Modal, ModalContent, ModalHeader, ModalTitle } from './ui/modal'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface GenerateReportModalProps {
  isOpen: boolean
  onClose: () => void
  onGenerateReport: (month: number, year: number) => void
}

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

export default function GenerateReportModal({ 
  isOpen, 
  onClose, 
  onGenerateReport 
}: GenerateReportModalProps) {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null)
  
  // App started being used in January 2024 (adjust as needed)
  const appStartYear = 2024
  const appStartMonth = 0 // January (0-indexed)
  const currentDate = new Date()
  const currentYear = currentDate.getFullYear()
  const currentMonth = currentDate.getMonth()

  const handleYearChange = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && selectedYear > appStartYear) {
      setSelectedYear(selectedYear - 1)
    } else if (direction === 'next' && selectedYear < currentYear) {
      setSelectedYear(selectedYear + 1)
    }
  }

  const isMonthAvailable = (month: number) => {
    // Can't select future months
    if (selectedYear === currentYear && month > currentMonth) {
      return false
    }
    
    // Can't select months before app started
    if (selectedYear === appStartYear && month < appStartMonth) {
      return false
    }
    
    return true
  }

  const handleMonthSelect = (month: number) => {
    if (isMonthAvailable(month)) {
      setSelectedMonth(month)
    }
  }

  const handleGenerate = () => {
    if (selectedMonth !== null) {
      onGenerateReport(selectedMonth, selectedYear)
      onClose()
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
            disabled={selectedYear <= appStartYear}
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
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleGenerate}
            disabled={selectedMonth === null}
          >
            Generate Report
          </Button>
        </div>
      </div>
    </Modal>
  )
}
