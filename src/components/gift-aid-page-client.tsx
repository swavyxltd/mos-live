'use client'

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Download, Calendar, FileText, AlertCircle, CheckCircle, XCircle, Clock, History, Search, TrendingUp, Users, Mail, Filter, CheckSquare, Square, FileDown, Loader2, FileSpreadsheet, Info, ChevronDown, ChevronUp } from 'lucide-react'
import { toast } from 'sonner'
import { Modal } from '@/components/ui/modal'

interface GiftAidRow {
  id: string
  title: string
  firstName: string
  lastName: string
  houseNameOrNumber: string
  postcode: string
  aggregatedDonations: string
  sponsoredEvent: string
  donationDate: string | Date
  amount: number
  parentName: string
  parentEmail: string
  parentPhone: string
  giftAidStatus?: string | null
  parentUserId?: string
  paymentCount?: number
}

export function GiftAidPageClient() {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [activeTab, setActiveTab] = useState<'active' | 'pending' | 'declined' | 'history' | 'analytics'>('active')
  const [data, setData] = useState<GiftAidRow[]>([])
  const [pendingData, setPendingData] = useState<GiftAidRow[]>([])
  const [declinedData, setDeclinedData] = useState<GiftAidRow[]>([])
  const [loading, setLoading] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [downloadingTemplate, setDownloadingTemplate] = useState(false)
  const [showProgressModal, setShowProgressModal] = useState(false)
  const [progress, setProgress] = useState(0)
  const [showTutorial, setShowTutorial] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)
  const [totalAmount, setTotalAmount] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPaymentCount, setTotalPaymentCount] = useState(0)
  const [history, setHistory] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [initialLoad, setInitialLoad] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedParents, setSelectedParents] = useState<Set<string>>(new Set())
  const [bulkUpdating, setBulkUpdating] = useState(false)
  const [sendingReminders, setSendingReminders] = useState(false)
  const [analytics, setAnalytics] = useState<any>(null)
  const [loadingAnalytics, setLoadingAnalytics] = useState(false)

  // Set default date range to last 12 months
  useEffect(() => {
    const end = new Date()
    const start = new Date()
    start.setMonth(start.getMonth() - 12)
    
    setEndDate(end.toISOString().split('T')[0])
    setStartDate(start.toISOString().split('T')[0])
  }, [])

  // Quick date presets
  const setDatePreset = async (preset: 'lastMonth' | 'lastQuarter' | 'lastYear' | 'thisYear' | 'allTime') => {
    const end = new Date()
    const start = new Date()
    
    switch (preset) {
      case 'lastMonth':
        start.setMonth(start.getMonth() - 1)
        start.setDate(1)
        break
      case 'lastQuarter':
        start.setMonth(start.getMonth() - 3)
        start.setDate(1)
        break
      case 'lastYear':
        start.setFullYear(start.getFullYear() - 1)
        start.setMonth(0)
        start.setDate(1)
        break
      case 'thisYear':
        start.setMonth(0)
        start.setDate(1)
        break
      case 'allTime':
        start.setFullYear(2020, 0, 1) // Set to a reasonable start date
        break
    }
    
    const newStartDate = start.toISOString().split('T')[0]
    const newEndDate = end.toISOString().split('T')[0]
    
    setStartDate(newStartDate)
    setEndDate(newEndDate)
    
    // Automatically fetch data with the new dates
    await fetchAllData(newStartDate, newEndDate)
  }

  const fetchData = async (status: 'YES' | 'NOT_SURE' | 'NO' = 'YES', customStartDate?: string, customEndDate?: string) => {
    const start = customStartDate || startDate
    const end = customEndDate || endDate
    
    if (!start || !end) {
      return
    }

    if (new Date(start) > new Date(end)) {
      return
    }

    try {
      const response = await fetch(
        `/api/gift-aid?startDate=${start}&endDate=${end}&status=${status}`
      )
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch gift aid data')
      }

      const result = await response.json()
      
      if (status === 'YES') {
        setData(result.data || [])
        setTotalAmount(result.totalAmount || 0)
        setTotalCount(result.total || 0)
        setTotalPaymentCount(result.totalPaymentCount || 0)
      } else if (status === 'NOT_SURE') {
        setPendingData(result.data || [])
      } else if (status === 'NO') {
        setDeclinedData(result.data || [])
      }
    } catch (error: any) {
      if (status === 'YES') {
        setData([])
        setTotalAmount(0)
        setTotalCount(0)
        setTotalPaymentCount(0)
      } else if (status === 'NOT_SURE') {
        setPendingData([])
      } else if (status === 'NO') {
        setDeclinedData([])
      }
    }
  }

  const fetchAllData = async (customStartDate?: string, customEndDate?: string) => {
    const start = customStartDate || startDate
    const end = customEndDate || endDate
    
    if (!start || !end) {
      return
    }

    setLoading(true)
    try {
      await Promise.all([
        fetchData('YES', start, end),
        fetchData('NOT_SURE', start, end),
        fetchData('NO', start, end)
      ])
    } finally {
      setLoading(false)
      setInitialLoad(false)
    }
  }

  const fetchAnalytics = async () => {
    setLoadingAnalytics(true)
    try {
      const response = await fetch('/api/gift-aid/analytics')
      if (response.ok) {
        const result = await response.json()
        setAnalytics(result)
      }
    } catch (error) {
      console.error('Failed to fetch analytics', error)
    } finally {
      setLoadingAnalytics(false)
    }
  }

  // Calculate earliest donation date for Box 1
  const earliestDonationDate = useMemo(() => {
    if (data.length === 0) return null
    const dates = data
      .map(row => {
        if (!row.donationDate) return null
        const date = typeof row.donationDate === 'string' ? new Date(row.donationDate) : row.donationDate
        return isNaN(date.getTime()) ? null : date
      })
      .filter((d): d is Date => d !== null)
    
    if (dates.length === 0) return null
    return new Date(Math.min(...dates.map(d => d.getTime())))
  }, [data])

  const formatDateForBox1 = (date: Date | null): string => {
    if (!date) return ''
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = String(date.getFullYear()).slice(-2)
    return `${day}/${month}/${year}`
  }

  const handleDownloadTemplate = async () => {
    setDownloadingTemplate(true)
    try {
      const response = await fetch('/api/giftaid/template')
      
      if (!response.ok) {
        const result = await response.json()
        if (result.downloadUrl) {
          // Open HMRC download page in new tab
          window.open(result.downloadUrl, '_blank')
          toast.info('Please download the template from the HMRC website')
        } else {
          throw new Error(result.error || 'Failed to download template')
        }
        return
      }

      // Check if response is a file or JSON
      const contentType = response.headers.get('Content-Type')
      if (contentType?.includes('application/json')) {
        const result = await response.json()
        if (result.downloadUrl) {
          window.open(result.downloadUrl, '_blank')
          toast.info('Please download the template from the HMRC website')
        }
        return
      }

      // Download the file
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'HMRC_Gift_Aid_Template.ods'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      toast.success('HMRC template downloaded successfully')
    } catch (error: any) {
      toast.error(error.message || 'Failed to download template')
    } finally {
      setDownloadingTemplate(false)
    }
  }

  const handleDownload = async () => {
    if (!startDate || !endDate) {
      toast.error('Please select both start and end dates')
      return
    }

    if (new Date(startDate) > new Date(endDate)) {
      toast.error('Start date must be before end date')
      return
    }

    // Check for missing data
    const missingDataCount = data.filter(row => !row.houseNameOrNumber || !row.postcode).length
    
    // HMRC Rule: Maximum 1,000 rows
    if (data.length > 1000) {
      toast.error(`Too many donations (${data.length}). HMRC limit is 1,000 rows. Please reduce the date range.`)
      return
    }
    
    if (missingDataCount > 0) {
      const proceed = confirm(
        `Warning: ${missingDataCount} entries are missing address or postcode information. ` +
        `The file will still be generated, but you should review and complete these fields before submitting to HMRC. ` +
        `For non-UK donors, the postcode will be set to 'X' automatically. Continue?`
      )
      if (!proceed) return
    }

    setDownloading(true)
    setShowProgressModal(true)
    setProgress(0)
    
    // Animate progress bar over 5 seconds
    const duration = 5000
    const startTime = Date.now()
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const newProgress = Math.min((elapsed / duration) * 100, 95) // Stop at 95% until download completes
      setProgress(newProgress)
    }, 50)

    try {
      const endpoint = `/api/giftaid/csv?startDate=${startDate}&endDate=${endDate}`
      
      const response = await fetch(endpoint)
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to generate file')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      
      const contentDisposition = response.headers.get('Content-Disposition')
      let filename = 'Gift-Aid-Schedule.csv'
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/)
        if (filenameMatch) {
          filename = filenameMatch[1]
        }
      }
      
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      // Complete progress bar
      clearInterval(progressInterval)
      setProgress(100)
      
      // Close modal after a brief delay
      setTimeout(() => {
        setShowProgressModal(false)
        setProgress(0)
        toast.success(`Gift Aid CSV file downloaded successfully`)
        fetchAllData() // Refresh to update history
      }, 300)
    } catch (error: any) {
      clearInterval(progressInterval)
      setShowProgressModal(false)
      setProgress(0)
      toast.error(error.message || 'Failed to download file')
    } finally {
      setDownloading(false)
    }
  }

  const handleUpdateStatus = async (parentUserId: string, status: 'YES' | 'NO') => {
    setUpdatingStatus(parentUserId)
    try {
      const response = await fetch('/api/gift-aid/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: parentUserId, status })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update status')
      }
      
      toast.success(`Gift Aid status updated to ${status === 'YES' ? 'Yes' : 'No'}`)
      
      if (status === 'YES') {
        setActiveTab('active')
        setTimeout(() => {
          fetchAllData()
        }, 500)
      } else {
        fetchAllData()
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update status')
    } finally {
      setUpdatingStatus(null)
    }
  }

  const handleSendReminders = async () => {
    if (selectedParents.size === 0) {
      toast.error('Please select at least one parent')
      return
    }

    setSendingReminders(true)
    try {
      const response = await fetch('/api/gift-aid/send-reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentIds: Array.from(selectedParents)
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to send reminders')
      }

      const result = await response.json()
      toast.success(`Reminders sent to ${result.sent} parent(s)${result.failed > 0 ? `, ${result.failed} failed` : ''}`)
      setSelectedParents(new Set())
    } catch (error: any) {
      toast.error(error.message || 'Failed to send reminders')
    } finally {
      setSendingReminders(false)
    }
  }

  const handleBulkUpdate = async (status: 'YES' | 'NO') => {
    if (selectedParents.size === 0) {
      toast.error('Please select at least one parent')
      return
    }

    setBulkUpdating(true)
    try {
      const promises = Array.from(selectedParents).map(userId => 
        fetch('/api/gift-aid/update-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, status })
        })
      )

      const results = await Promise.allSettled(promises)
      const successful = results.filter(r => r.status === 'fulfilled').length
      const failed = results.filter(r => r.status === 'rejected').length

      if (successful > 0) {
        toast.success(`Successfully updated ${successful} parent${successful > 1 ? 's' : ''}`)
      }
      if (failed > 0) {
        toast.error(`Failed to update ${failed} parent${failed > 1 ? 's' : ''}`)
      }

      setSelectedParents(new Set())
      if (status === 'YES') {
        setActiveTab('active')
        setTimeout(() => {
          fetchAllData()
        }, 500)
      } else {
        fetchAllData()
      }
    } catch (error: any) {
      toast.error('Failed to update parents')
    } finally {
      setBulkUpdating(false)
    }
  }

  const fetchHistory = async () => {
    setLoadingHistory(true)
    try {
      const response = await fetch('/api/gift-aid/history')
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch history')
      }

      const result = await response.json()
      setHistory(result.data || [])
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch history')
      setHistory([])
    } finally {
      setLoadingHistory(false)
    }
  }

  // Filtered data based on search
  const filteredData = useMemo(() => {
    const currentData = activeTab === 'active' ? data : activeTab === 'pending' ? pendingData : declinedData
    
    if (!searchQuery.trim()) return currentData
    
    const query = searchQuery.toLowerCase()
    return currentData.filter(row => 
      row.parentName?.toLowerCase().includes(query) ||
      row.parentEmail?.toLowerCase().includes(query) ||
      row.parentPhone?.toLowerCase().includes(query) ||
      row.houseNameOrNumber?.toLowerCase().includes(query) ||
      row.postcode?.toLowerCase().includes(query)
    )
  }, [data, pendingData, declinedData, activeTab, searchQuery])

  // Calculate validation stats
  const validationStats = useMemo(() => {
    const missingAddress = data.filter(r => !r.houseNameOrNumber).length
    const missingPostcode = data.filter(r => !r.postcode).length
    const missingBoth = data.filter(r => !r.houseNameOrNumber && !r.postcode).length
    const complete = data.filter(r => r.houseNameOrNumber && r.postcode).length
    
    return { missingAddress, missingPostcode, missingBoth, complete, total: data.length }
  }, [data])

  // Load all data when dates change or on initial load
  useEffect(() => {
    if (startDate && endDate && initialLoad) {
      fetchAllData()
      setInitialLoad(false)
    }
  }, [startDate, endDate])

  // Fetch history when history tab is active
  useEffect(() => {
    if (activeTab === 'history' && history.length === 0) {
      fetchHistory()
    }
  }, [activeTab])

  // Fetch analytics when analytics tab is active
  useEffect(() => {
    if (activeTab === 'analytics') {
      fetchAnalytics()
    }
  }, [activeTab])

  const toggleSelectParent = (userId: string) => {
    const newSelected = new Set(selectedParents)
    if (newSelected.has(userId)) {
      newSelected.delete(userId)
    } else {
      newSelected.add(userId)
    }
    setSelectedParents(newSelected)
  }

  const toggleSelectAll = () => {
    const currentData = activeTab === 'pending' ? pendingData : []
    if (selectedParents.size === currentData.length) {
      setSelectedParents(new Set())
    } else {
      setSelectedParents(new Set(currentData.map(p => p.parentUserId!).filter(Boolean)))
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">
          Gift Aid Management
        </h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Generate HMRC-compliant Gift Aid submissions and manage parent declarations
        </p>
      </div>

      {/* Date Range Selector with Quick Presets */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Select Date Range
          </CardTitle>
          <CardDescription>
            Choose the period for which you want to generate the Gift Aid submission
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Quick Presets */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDatePreset('lastMonth')}
              >
                Last Month
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDatePreset('lastQuarter')}
              >
                Last Quarter
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDatePreset('lastYear')}
              >
                Last Year
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDatePreset('thisYear')}
              >
                This Year
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDatePreset('allTime')}
              >
                All Time
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button onClick={fetchAllData} disabled={loading || !startDate || !endDate}>
                {loading ? 'Loading...' : 'Refresh Data'}
              </Button>
              <Button 
                onClick={handleDownloadTemplate} 
                disabled={downloadingTemplate}
                variant="outline"
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                {downloadingTemplate ? 'Downloading...' : 'Download HMRC Template'}
              </Button>
              <Button 
                onClick={handleDownload} 
                disabled={downloading || !startDate || !endDate || data.length === 0 || activeTab !== 'active'}
                className="bg-green-600 hover:bg-green-700"
              >
                <Download className="h-4 w-4 mr-2" />
                {downloading ? 'Generating...' : 'Download CSV Data'}
              </Button>
            </div>
            
            {/* Tutorial Section */}
            {data.length > 0 && activeTab === 'active' && (
              <div className="mt-4">
                <button
                  onClick={() => setShowTutorial(!showTutorial)}
                  className="w-full flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-sm text-blue-900">
                      How to Submit to HMRC - Step by Step Guide
                    </span>
                  </div>
                  {showTutorial ? (
                    <ChevronUp className="h-4 w-4 text-blue-600" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-blue-600" />
                  )}
                </button>
                
                {showTutorial && (
                  <div className="mt-2 p-4 bg-white border border-blue-200 rounded-lg">
                    <div className="space-y-3">
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-xs font-bold text-blue-700">1</span>
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm text-gray-900 mb-0.5">Download Both Files</p>
                          <p className="text-xs text-gray-600">
                            Download both the <strong className="text-gray-900">HMRC Template (ODS)</strong> and the <strong className="text-gray-900">CSV Data</strong> files using the buttons above.
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-xs font-bold text-blue-700">2</span>
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm text-gray-900 mb-0.5">Open the CSV File</p>
                          <p className="text-xs text-gray-600">
                            Open the downloaded CSV file in a spreadsheet application (Excel, LibreOffice, Google Sheets, etc.).
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-xs font-bold text-blue-700">3</span>
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm text-gray-900 mb-0.5">Copy All Data</p>
                          <p className="text-xs text-gray-600">
                            Select all rows and columns in the CSV file (Ctrl+A or Cmd+A) and copy them (Ctrl+C or Cmd+C).
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-xs font-bold text-blue-700">4</span>
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm text-gray-900 mb-0.5">Open the HMRC Template</p>
                          <p className="text-xs text-gray-600">
                            Open the downloaded HMRC template ODS file in LibreOffice Calc (recommended) or Excel.
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-xs font-bold text-blue-700">5</span>
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm text-gray-900 mb-1">Fill in Box 1 (Earliest Donation Date)</p>
                          <p className="text-xs text-gray-600 mb-2">
                            Find the section labeled <strong className="text-gray-900">"Box 1"</strong> and enter the earliest donation date in DD/MM/YY format:
                          </p>
                          {earliestDonationDate ? (
                            <div className="bg-gray-50 p-2 rounded border border-blue-300">
                              <p className="font-mono text-base font-bold text-gray-900">
                                {formatDateForBox1(earliestDonationDate)}
                              </p>
                              <p className="text-xs text-gray-500 mt-0.5">
                                This is the earliest payment date from your selected period
                              </p>
                            </div>
                          ) : (
                            <p className="text-xs text-gray-500 italic">
                              No donation dates found in the selected period.
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-xs font-bold text-blue-700">6</span>
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm text-gray-900 mb-1">Paste Data into the Template</p>
                          <p className="text-xs text-gray-600 mb-1">
                            Navigate to the first data cell in the donations schedule table (usually below the header row). Then:
                          </p>
                          <ol className="list-decimal list-inside space-y-0.5 text-xs text-gray-600 ml-1">
                            <li>Right-click on the first cell where you want to paste</li>
                            <li>Select <strong className="text-gray-900">"Paste Special"</strong> from the context menu</li>
                            <li>Choose <strong className="text-gray-900">"Unformatted Text"</strong> from the sub-menu</li>
                          </ol>
                        </div>
                      </div>
                      
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-xs font-bold text-blue-700">7</span>
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm text-gray-900 mb-1">Configure Separator Options</p>
                          <p className="text-xs text-gray-600 mb-1">
                            When the "Separator Options" dialog appears:
                          </p>
                          <ol className="list-decimal list-inside space-y-0.5 text-xs text-gray-600 ml-1">
                            <li>Select <strong className="text-gray-900">"Separated by"</strong> (radio button)</li>
                            <li>Check the <strong className="text-gray-900">"Tab"</strong> checkbox</li>
                            <li>Click <strong className="text-gray-900">"OK"</strong></li>
                          </ol>
                        </div>
                      </div>
                      
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-xs font-bold text-blue-700">8</span>
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm text-gray-900 mb-1">Verify Data</p>
                          <p className="text-xs text-gray-600 mb-1">
                            Double-check that all data has been pasted correctly into the appropriate columns. Verify:
                          </p>
                          <ul className="list-disc list-inside space-y-0.5 text-xs text-gray-600 ml-1">
                            <li>All rows are present</li>
                            <li>Data is in the correct columns</li>
                            <li>Dates are in DD/MM/YY format</li>
                            <li>Amounts are numeric (no £ signs)</li>
                          </ul>
                        </div>
                      </div>
                      
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-xs font-bold text-blue-700">9</span>
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm text-gray-900 mb-0.5">Save and Upload</p>
                          <p className="text-xs text-gray-600">
                            Save the ODS file and upload it to HMRC's Gift Aid submission portal. The file is now ready for submission.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {data.length > 0 && activeTab === 'active' && !showTutorial && (
              <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-xs text-green-800">
                  <strong>Important:</strong> HMRC only accepts ODS files. Download both the template and CSV, then follow the tutorial above to combine them.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      {data.length > 0 && activeTab === 'active' && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Payments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalPaymentCount}</div>
              <p className="text-xs text-muted-foreground mt-1">{totalCount} unique parents</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Amount</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">£{totalAmount.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Gift Aid Value (25%)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">£{(totalAmount * 0.25).toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Data Completeness</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{validationStats.complete}/{validationStats.total}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {validationStats.missingBoth > 0 && `${validationStats.missingBoth} missing both`}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[var(--border)] overflow-x-auto">
        <button
          onClick={() => setActiveTab('active')}
          className={`px-4 py-2 font-medium text-sm transition-colors whitespace-nowrap ${
            activeTab === 'active'
              ? 'border-b-2 border-[var(--primary)] text-[var(--primary)]'
              : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
          }`}
        >
          <CheckCircle className="h-4 w-4 inline mr-2" />
          Active Gift Aid
        </button>
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-2 font-medium text-sm transition-colors whitespace-nowrap ${
            activeTab === 'pending'
              ? 'border-b-2 border-[var(--primary)] text-[var(--primary)]'
              : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
          }`}
        >
          <Clock className="h-4 w-4 inline mr-2" />
          Pending Contact ({pendingData.length})
        </button>
        <button
          onClick={() => setActiveTab('declined')}
          className={`px-4 py-2 font-medium text-sm transition-colors whitespace-nowrap ${
            activeTab === 'declined'
              ? 'border-b-2 border-[var(--primary)] text-[var(--primary)]'
              : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
          }`}
        >
          <XCircle className="h-4 w-4 inline mr-2" />
          Declined ({declinedData.length})
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-4 py-2 font-medium text-sm transition-colors whitespace-nowrap ${
            activeTab === 'analytics'
              ? 'border-b-2 border-[var(--primary)] text-[var(--primary)]'
              : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
          }`}
        >
          <TrendingUp className="h-4 w-4 inline mr-2" />
          Analytics
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 font-medium text-sm transition-colors whitespace-nowrap ${
            activeTab === 'history'
              ? 'border-b-2 border-[var(--primary)] text-[var(--primary)]'
              : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
          }`}
        >
          <History className="h-4 w-4 inline mr-2" />
          History
        </button>
      </div>

      {/* Validation Warning */}
      {data.length > 0 && activeTab === 'active' && validationStats.missingBoth > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-800 dark:text-yellow-200">
            <p className="font-medium mb-1">Data Validation Warning</p>
            <p>
              {validationStats.missingBoth} entry{validationStats.missingBoth > 1 ? 'ies' : 'y'} {validationStats.missingBoth > 1 ? 'are' : 'is'} missing address or postcode information. 
              {validationStats.missingAddress > validationStats.missingBoth && ` ${validationStats.missingAddress - validationStats.missingBoth} additional entries are missing addresses.`}
              {validationStats.missingPostcode > validationStats.missingBoth && ` ${validationStats.missingPostcode - validationStats.missingBoth} additional entries are missing postcodes.`}
              Please review and complete these fields before submitting to HMRC.
            </p>
          </div>
        </div>
      )}

      {/* Pending tab info */}
      {activeTab === 'pending' && pendingData.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 flex items-start gap-3">
          <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800 dark:text-blue-200">
            <p className="font-medium mb-1">Contact Parents for Gift Aid</p>
            <p>
              These parents selected "Not Sure" during setup. Contact them to provide more information 
              about Gift Aid and update their status. Once updated to "Yes", their payments will appear 
              in the Active Gift Aid tab.
            </p>
          </div>
        </div>
      )}

      {/* Declined tab info */}
      {activeTab === 'declined' && declinedData.length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-800 rounded-lg p-4 flex items-start gap-3">
          <XCircle className="h-5 w-5 text-gray-600 dark:text-gray-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-gray-800 dark:text-gray-200">
            <p className="font-medium mb-1">Parents Who Declined Gift Aid</p>
            <p>
              These parents have declined Gift Aid. Their payments will not be included in Gift Aid submissions.
            </p>
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Gift Aid Overview</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingAnalytics ? (
                <div className="text-center py-8">Loading analytics...</div>
              ) : analytics ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Gift Aid Claimed (All Time)</p>
                    <p className="text-2xl font-bold">£{analytics.totalClaimed?.toFixed(2) || '0.00'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Active Gift Aid Parents</p>
                    <p className="text-2xl font-bold">{analytics.activeParents || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Pending Contact</p>
                    <p className="text-2xl font-bold">{analytics.pendingParents || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Potential Additional Value</p>
                    <p className="text-2xl font-bold text-green-600">
                      £{analytics.potentialValue?.toFixed(2) || '0.00'}
                    </p>
                    <p className="text-xs text-muted-foreground">If all pending parents sign up</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Analytics data will appear here
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start" onClick={() => setActiveTab('pending')}>
                  <Mail className="h-4 w-4 mr-2" />
                  Contact Pending Parents
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={() => setActiveTab('active')}>
                  <FileText className="h-4 w-4 mr-2" />
                  Generate Submission
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={() => setActiveTab('history')}>
                  <History className="h-4 w-4 mr-2" />
                  View Submission History
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Data Table */}
      {activeTab !== 'history' && activeTab !== 'analytics' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {activeTab === 'active' ? 'Gift Aid Preview' : activeTab === 'pending' ? 'Parents Pending Contact' : 'Parents Who Declined Gift Aid'}
                </CardTitle>
                <CardDescription>
                  {activeTab === 'active' 
                    ? 'Preview of payments that will be included in the submission file'
                    : activeTab === 'pending'
                    ? 'Parents who need to be contacted about Gift Aid'
                    : 'Parents who have declined Gift Aid'}
                </CardDescription>
              </div>
              {/* Search and Bulk Actions */}
              {activeTab === 'pending' && filteredData.length > 0 && (
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search parents..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 w-64"
                    />
                  </div>
                  {selectedParents.size > 0 && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleBulkUpdate('YES')}
                        disabled={bulkUpdating || sendingReminders}
                        className="text-green-600"
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Approve Selected ({selectedParents.size})
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleSendReminders}
                        disabled={bulkUpdating || sendingReminders}
                        className="text-blue-600"
                      >
                        <Mail className="h-3 w-3 mr-1" />
                        {sendingReminders ? 'Sending...' : `Send Reminders (${selectedParents.size})`}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedParents(new Set())}
                        disabled={bulkUpdating || sendingReminders}
                      >
                        Clear
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loading && initialLoad ? (
              <div className="text-center py-8 text-[var(--muted-foreground)]">
                Loading data...
              </div>
            ) : filteredData.length === 0 ? (
              <div className="text-center py-8 text-[var(--muted-foreground)]">
                {searchQuery ? 'No results found for your search.' : (
                  activeTab === 'active' 
                    ? 'No payments found for the selected date range. Adjust your date range and try again.'
                    : activeTab === 'pending'
                    ? 'No parents pending contact for the selected date range.'
                    : 'No parents have declined Gift Aid.'
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--border)]">
                      {activeTab === 'pending' && (
                        <th className="text-left p-2 font-semibold text-sm w-12">
                          <button
                            onClick={toggleSelectAll}
                            className="p-1 hover:bg-muted rounded"
                          >
                            {selectedParents.size === filteredData.length ? (
                              <CheckSquare className="h-4 w-4" />
                            ) : (
                              <Square className="h-4 w-4" />
                            )}
                          </button>
                        </th>
                      )}
                      <th className="text-left p-2 font-semibold text-sm">Item</th>
                      {activeTab === 'active' && (
                        <>
                          <th className="text-left p-2 font-semibold text-sm">Title</th>
                          <th className="text-left p-2 font-semibold text-sm">First Name</th>
                          <th className="text-left p-2 font-semibold text-sm">Last Name</th>
                          <th className="text-left p-2 font-semibold text-sm">House Name/Number</th>
                          <th className="text-left p-2 font-semibold text-sm">Postcode</th>
                          <th className="text-left p-2 font-semibold text-sm">Date</th>
                          <th className="text-right p-2 font-semibold text-sm">Amount</th>
                        </>
                      )}
                      {(activeTab === 'pending' || activeTab === 'declined') && (
                        <>
                          <th className="text-left p-2 font-semibold text-sm">Parent Name</th>
                          <th className="text-left p-2 font-semibold text-sm">Email</th>
                          <th className="text-left p-2 font-semibold text-sm">Phone</th>
                          <th className="text-left p-2 font-semibold text-sm">Address</th>
                          <th className="text-left p-2 font-semibold text-sm">Postcode</th>
                          {activeTab === 'pending' && (
                            <th className="text-center p-2 font-semibold text-sm">Actions</th>
                          )}
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.map((row, index) => (
                      <tr key={row.id} className="border-b border-[var(--border)] hover:bg-[var(--muted)]/50">
                        {activeTab === 'pending' && row.parentUserId && (
                          <td className="p-2">
                            <button
                              onClick={() => toggleSelectParent(row.parentUserId!)}
                              className="p-1 hover:bg-muted rounded"
                            >
                              {selectedParents.has(row.parentUserId) ? (
                                <CheckSquare className="h-4 w-4" />
                              ) : (
                                <Square className="h-4 w-4" />
                              )}
                            </button>
                          </td>
                        )}
                        <td className="p-2 text-sm">{index + 1}</td>
                        {activeTab === 'active' && (
                          <>
                            <td className="p-2 text-sm">{row.title || ''}</td>
                            <td className="p-2 text-sm">{row.firstName || ''}</td>
                            <td className="p-2 text-sm">{row.lastName || ''}</td>
                            <td className="p-2 text-sm text-[var(--foreground)]">
                              {row.houseNameOrNumber || <span className="text-yellow-600 dark:text-yellow-400">Missing</span>}
                            </td>
                            <td className="p-2 text-sm text-[var(--foreground)]">
                              {row.postcode || <span className="text-yellow-600 dark:text-yellow-400">Missing</span>}
                            </td>
                            <td className="p-2 text-sm">
                              {row.donationDate ? (() => {
                                const date = new Date(row.donationDate)
                                const day = String(date.getDate()).padStart(2, '0')
                                const month = String(date.getMonth() + 1).padStart(2, '0')
                                const year = String(date.getFullYear()).slice(-2)
                                return `${day}/${month}/${year}`
                              })() : 'N/A'}
                            </td>
                            <td className="p-2 text-sm text-right">£{row.amount.toFixed(2)}</td>
                          </>
                        )}
                        {(activeTab === 'pending' || activeTab === 'declined') && row.parentUserId && (
                          <>
                            <td className="p-2 text-sm">{row.parentName || 'N/A'}</td>
                            <td className="p-2 text-sm">{row.parentEmail || 'N/A'}</td>
                            <td className="p-2 text-sm">{row.parentPhone || 'N/A'}</td>
                            <td className="p-2 text-sm text-[var(--foreground)]">
                              {row.houseNameOrNumber || <span className="text-yellow-600 dark:text-yellow-400">Missing</span>}
                            </td>
                            <td className="p-2 text-sm text-[var(--foreground)]">
                              {row.postcode || <span className="text-yellow-600 dark:text-yellow-400">Missing</span>}
                            </td>
                            {activeTab === 'pending' && (
                              <td className="p-2 text-sm text-center">
                                <div className="flex gap-2 justify-center">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleUpdateStatus(row.parentUserId!, 'YES')}
                                    disabled={updatingStatus === row.parentUserId}
                                    className="text-green-600 border-green-600 hover:bg-green-50"
                                  >
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Yes
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleUpdateStatus(row.parentUserId!, 'NO')}
                                    disabled={updatingStatus === row.parentUserId}
                                    className="text-red-600 border-red-600 hover:bg-red-50"
                                  >
                                    <XCircle className="h-3 w-3 mr-1" />
                                    No
                                  </Button>
                                </div>
                              </td>
                            )}
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Submission History
            </CardTitle>
            <CardDescription>
              View all past Gift Aid submissions that have been generated
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingHistory ? (
              <div className="text-center py-8 text-[var(--muted-foreground)]">
                Loading history...
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-8 text-[var(--muted-foreground)]">
                No submission history found. Generate your first Gift Aid file to see it here.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--border)]">
                      <th className="text-left p-2 font-semibold text-sm">Date Generated</th>
                      <th className="text-left p-2 font-semibold text-sm">Period</th>
                      <th className="text-left p-2 font-semibold text-sm">Filename</th>
                      <th className="text-right p-2 font-semibold text-sm">Total Count</th>
                      <th className="text-right p-2 font-semibold text-sm">Total Amount</th>
                      <th className="text-right p-2 font-semibold text-sm">Gift Aid Value</th>
                      <th className="text-left p-2 font-semibold text-sm">Generated By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((submission) => (
                      <tr key={submission.id} className="border-b border-[var(--border)] hover:bg-[var(--muted)]/50">
                        <td className="p-2 text-sm">
                          {new Date(submission.createdAt).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                        <td className="p-2 text-sm">
                          {new Date(submission.startDate).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })} - {new Date(submission.endDate).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </td>
                        <td className="p-2 text-sm font-mono text-xs">{submission.filename}</td>
                        <td className="p-2 text-sm text-right">{submission.totalCount}</td>
                        <td className="p-2 text-sm text-right">£{submission.totalAmount.toFixed(2)}</td>
                        <td className="p-2 text-sm text-right">£{(submission.totalAmount * 0.25).toFixed(2)}</td>
                        <td className="p-2 text-sm">{submission.generatedBy.name || submission.generatedBy.email}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Progress Modal */}
      <Modal
        isOpen={showProgressModal}
        onClose={() => {}} // Prevent closing during download
        title="Generating Gift Aid CSV"
        className="w-[400px]"
      >
        <div className="space-y-6 py-4">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 text-[var(--primary)] animate-spin" />
            <div className="text-center">
              <p className="text-sm font-medium text-[var(--foreground)] mb-1">
                Processing your Gift Aid data...
              </p>
              <p className="text-xs text-[var(--muted-foreground)]">
                This may take a few moments
              </p>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="w-full h-2 bg-[var(--muted)] rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--primary)] rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-center text-[var(--muted-foreground)]">
              {Math.round(progress)}% complete
            </p>
          </div>
        </div>
      </Modal>
    </div>
  )
}
