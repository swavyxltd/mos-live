'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Activity, 
  X as CloseIcon,
  ChevronLeft,
  ChevronRight,
  Filter,
  Search
} from 'lucide-react'

interface FinancialActivity {
  action: string
  timestamp: string
  user: { name: string; email: string }
  type: 'payment' | 'invoice' | 'reminder' | 'cash_payment'
  amount: string
  studentName?: string
  class?: string
  paymentMethod?: string
}

interface RecentActivityModalProps {
  isOpen: boolean
  onClose: () => void
  activities: FinancialActivity[]
}

export function RecentActivityModal({ isOpen, onClose, activities }: RecentActivityModalProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  
  
  const itemsPerPage = 10
  
  // Filter activities based on search and type
  const filteredActivities = activities.filter(activity => {
    const matchesSearch = activity.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         activity.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         activity.user.name.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesFilter = filterType === 'all' || activity.type === filterType
    
    return matchesSearch && matchesFilter
  })
  
  // Calculate pagination
  const totalPages = Math.ceil(filteredActivities.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentActivities = filteredActivities.slice(startIndex, endIndex)
  
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }
  
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'payment': return 'bg-green-500'
      case 'invoice': return 'bg-blue-500'
      case 'reminder': return 'bg-orange-500'
      case 'cash_payment': return 'bg-purple-500'
      default: return 'bg-gray-500'
    }
  }
  
  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'payment': return 'Payment'
      case 'invoice': return 'Invoice'
      case 'reminder': return 'Reminder'
      case 'cash_payment': return 'Cash Payment'
      default: return 'Activity'
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-white/20 backdrop-blur-md"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white border border-gray-200 rounded-xl shadow-xl w-[75vw] max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">Recent Financial Activity</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-gray-100 transition-colors"
          >
            <CloseIcon className="h-4 w-4 text-gray-500" />
          </button>
        </div>
        
        {/* Content - Scrollable */}
        <div className="p-6 overflow-y-auto flex-1">
          <p className="text-sm text-gray-500 mb-6">View all financial transactions and activities</p>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search activities, students, or users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              <option value="payment">Payments</option>
              <option value="invoice">Invoices</option>
              <option value="reminder">Reminders</option>
              <option value="cash_payment">Cash Payments</option>
            </select>
          </div>
        </div>

        {/* Activity List */}
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {currentActivities.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No activities found matching your criteria</p>
            </div>
          ) : (
            currentActivities.map((activity, index) => (
              <Card key={index} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={`w-3 h-3 rounded-full mt-2 ${getTypeColor(activity.type)}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                        <Badge variant="secondary" className="text-xs">
                          {getTypeLabel(activity.type)}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500 mb-2">{activity.timestamp}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>By: {activity.user.name}</span>
                        {activity.studentName && <span>Student: {activity.studentName}</span>}
                        {activity.class && <span>Class: {activity.class}</span>}
                        {activity.paymentMethod && <span>Method: {activity.paymentMethod}</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-green-600">
                        {activity.amount}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
            <div className="text-sm text-gray-500">
              Showing {startIndex + 1} to {Math.min(endIndex, filteredActivities.length)} of {filteredActivities.length} activities
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="flex items-center gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum
                  if (totalPages <= 5) {
                    pageNum = i + 1
                  } else if (currentPage <= 3) {
                    pageNum = i + 1
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i
                  } else {
                    pageNum = currentPage - 2 + i
                  }
                  
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePageChange(pageNum)}
                      className="w-8 h-8 p-0"
                    >
                      {pageNum}
                    </Button>
                  )
                })}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  )
}
