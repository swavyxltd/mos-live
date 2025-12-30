'use client'

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { StatCard } from '@/components/ui/stat-card'
import { Download, Calendar, FileText, AlertCircle, CheckCircle, XCircle, Clock, History, Search, TrendingUp, Users, Mail, Filter, CheckSquare, Square, FileDown, Loader2, FileSpreadsheet, Info, ChevronDown, ChevronUp, Gift, DollarSign, FileCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Modal } from '@/components/ui/modal'
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog'
import { StudentDetailModal } from '@/components/student-detail-modal'

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
  studentId?: string
  paymentCount?: number
}

export function GiftAidPageClient() {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [activeTab, setActiveTab] = useState<'active' | 'eligible' | 'pending' | 'declined' | 'history' | 'analytics'>('active')
  const [data, setData] = useState<GiftAidRow[]>([])
  const [showMissingDataConfirm, setShowMissingDataConfirm] = useState(false)
  const [pendingDownload, setPendingDownload] = useState<{ data: GiftAidRow[], missingCount: number } | null>(null)
  const [eligibleData, setEligibleData] = useState<GiftAidRow[]>([])
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
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false)
  const [initialStudentTab, setInitialStudentTab] = useState<string>('overview')

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

  const fetchEligibleParents = async () => {
    try {
      // Fetch eligible parents using the same API but with a flag to return parents only
      // Use a wide date range to get all eligible parents
      const end = new Date()
      const start = new Date()
      start.setFullYear(start.getFullYear() - 10) // 10 years back to get all parents
      
      const startDateStr = start.toISOString().split('T')[0]
      const endDateStr = end.toISOString().split('T')[0]
      
      const response = await fetch(`/api/gift-aid?startDate=${startDateStr}&endDate=${endDateStr}&status=YES&parentsOnly=true`)
      if (response.ok) {
        const result = await response.json()
        setEligibleData(result.data || [])
      } else {
        // Fallback: fetch payment data and extract unique parents
        const paymentResponse = await fetch(`/api/gift-aid?startDate=${startDateStr}&endDate=${endDateStr}&status=YES`)
        if (paymentResponse.ok) {
          const paymentResult = await paymentResponse.json()
          // Extract unique parents from payment data
          const uniqueParents = new Map<string, GiftAidRow>()
          if (paymentResult.data) {
            paymentResult.data.forEach((row: GiftAidRow) => {
              if (row.parentUserId && !uniqueParents.has(row.parentUserId)) {
                uniqueParents.set(row.parentUserId, {
                  ...row,
                  amount: 0,
                  paymentCount: 0
                })
              }
            })
          }
          setEligibleData(Array.from(uniqueParents.values()))
        }
      }
    } catch (error) {
      console.error('Failed to fetch eligible parents', error)
      setEligibleData([])
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
        fetchData('NO', start, end),
        fetchEligibleParents()
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
      setPendingDownload({ data, missingCount: missingDataCount })
      setShowMissingDataConfirm(true)
      return
    }

    proceedWithDownload(data)
  }

  const proceedWithDownload = async (dataToDownload: GiftAidRow[]) => {
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
        // Switch to active tab if updating from pending or declined
        if (activeTab === 'pending' || activeTab === 'declined') {
          setActiveTab('active')
        }
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
    const currentData = activeTab === 'active' ? data : activeTab === 'eligible' ? eligibleData : activeTab === 'pending' ? pendingData : declinedData
    
    if (!searchQuery.trim()) return currentData
    
    const query = searchQuery.toLowerCase()
    return currentData.filter(row => 
      row.parentName?.toLowerCase().includes(query) ||
      row.parentEmail?.toLowerCase().includes(query) ||
      row.parentPhone?.toLowerCase().includes(query) ||
      row.houseNameOrNumber?.toLowerCase().includes(query) ||
      row.postcode?.toLowerCase().includes(query)
    )
  }, [data, eligibleData, pendingData, declinedData, activeTab, searchQuery])

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

  // Fetch eligible parents when eligible tab is active
  useEffect(() => {
    if (activeTab === 'eligible' && eligibleData.length === 0) {
      fetchEligibleParents()
    }
  }, [activeTab])

  // Function to open student modal with a specific tab
  const openStudentModal = async (row: GiftAidRow, tab: string = 'overview') => {
    // If we have studentId directly (from active tab payment records), use it
    if (row.studentId) {
      setInitialStudentTab(tab)
      setSelectedStudentId(row.studentId)
      setIsStudentModalOpen(true)
      return
    }

    // Otherwise, find student by parent ID
    if (!row.parentUserId) {
      toast.error('No parent information available')
      return
    }

    try {
      // Fetch students for this parent
      const response = await fetch(`/api/students?parentId=${row.parentUserId}`)
      if (response.ok) {
        const students = await response.json()
        if (students && students.length > 0) {
          setInitialStudentTab(tab)
          setSelectedStudentId(students[0].id)
          setIsStudentModalOpen(true)
        } else {
          toast.error('No students found for this parent')
        }
      } else {
        toast.error('Unable to find student information')
      }
    } catch (error) {
      console.error('Error fetching students:', error)
      toast.error('Failed to load student information')
    }
  }

  // Function to handle row click - find and open student profile with Parents tab
  const handleRowClick = async (row: GiftAidRow) => {
    await openStudentModal(row, 'parents')
  }

  // Function to handle parent name click - open parents tab (same as row click)
  const handleParentNameClick = async (e: React.MouseEvent, row: GiftAidRow) => {
    e.stopPropagation() // Prevent row click from firing twice
    await openStudentModal(row, 'parents')
  }

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
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--foreground)]">
            Gift Aid Management
          </h1>
          <p className="mt-1 text-sm sm:text-base text-[var(--muted-foreground)]">
            Generate HMRC-compliant Gift Aid submissions and manage parent declarations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Gift className="h-5 w-5 text-[var(--muted-foreground)]" />
        </div>
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
            <div className="flex flex-wrap gap-2">
              <Button 
                onClick={fetchAllData} 
                disabled={loading || !startDate || !endDate}
                variant="outline"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <Filter className="h-4 w-4 mr-2" />
                    Refresh Data
                  </>
                )}
              </Button>
              <Button 
                onClick={handleDownloadTemplate} 
                disabled={downloadingTemplate}
                variant="outline"
              >
                {downloadingTemplate ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Downloading...
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Download HMRC Template
                  </>
                )}
              </Button>
              <Button 
                onClick={handleDownload} 
                disabled={downloading || !startDate || !endDate || data.length === 0 || activeTab !== 'active'}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {downloading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Download CSV Data
                  </>
                )}
              </Button>
            </div>
            
            {/* Tutorial Section */}
            {data.length > 0 && activeTab === 'active' && (
              <div className="mt-4">
                <button
                  onClick={() => setShowTutorial(!showTutorial)}
                  className="w-full flex items-center justify-between p-3 bg-[var(--muted)] border border-[var(--border)] rounded-lg hover:bg-[var(--muted)]/80 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-[var(--foreground)]" />
                    <span className="font-medium text-sm text-[var(--foreground)]">
                      How to Submit to HMRC - Step by Step Guide
                    </span>
                  </div>
                  {showTutorial ? (
                    <ChevronUp className="h-4 w-4 text-[var(--foreground)]" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-[var(--foreground)]" />
                  )}
                </button>
                
                {showTutorial && (
                  <div className="mt-2 p-6 bg-[var(--card)] border border-[var(--border)] rounded-lg">
                    <div className="space-y-4">
                      {/* Step 1 */}
                      <div className="flex gap-4">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--primary)] text-white flex items-center justify-center font-bold text-sm">
                          1
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-sm text-gray-900 mb-1">Download Both Files</h4>
                          <p className="text-sm text-gray-600">
                            Download both the <strong>HMRC Template (ODS)</strong> and the <strong>CSV Data</strong> files using the buttons above.
                          </p>
                        </div>
                      </div>

                      {/* Step 2 */}
                      <div className="flex gap-4">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--primary)] text-white flex items-center justify-center font-bold text-sm">
                          2
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-sm text-gray-900 mb-1">Open the CSV File</h4>
                          <p className="text-sm text-gray-600">
                            Open the downloaded CSV file in a spreadsheet application (Excel, LibreOffice, Google Sheets, etc.).
                          </p>
                        </div>
                      </div>

                      {/* Step 3 */}
                      <div className="flex gap-4">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--primary)] text-white flex items-center justify-center font-bold text-sm">
                          3
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-sm text-gray-900 mb-1">Copy All Data</h4>
                          <p className="text-sm text-gray-600">
                            Select all rows and columns in the CSV file (Ctrl+A or Cmd+A) and copy them (Ctrl+C or Cmd+C).
                          </p>
                        </div>
                      </div>

                      {/* Step 4 */}
                      <div className="flex gap-4">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--primary)] text-white flex items-center justify-center font-bold text-sm">
                          4
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-sm text-gray-900 mb-1">Open the HMRC Template</h4>
                          <p className="text-sm text-gray-600">
                            Open the downloaded HMRC template ODS file in LibreOffice Calc (recommended) or Excel.
                          </p>
                        </div>
                      </div>

                      {/* Step 5 */}
                      <div className="flex gap-4">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--primary)] text-white flex items-center justify-center font-bold text-sm">
                          5
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-sm text-gray-900 mb-1">Fill in Box 1</h4>
                          <p className="text-sm text-gray-600 mb-2">
                            Find the section labeled <strong>"Box 1"</strong> and enter the earliest donation date in DD/MM/YY format:
                          </p>
                          {earliestDonationDate ? (
                            <div className="bg-[var(--muted)] p-3 rounded border border-[var(--border)]">
                              <p className="font-mono text-base font-bold text-[var(--foreground)]">
                                {formatDateForBox1(earliestDonationDate)}
                              </p>
                              <p className="text-sm text-[var(--muted-foreground)] mt-1">
                                Earliest payment date
                              </p>
                            </div>
                          ) : (
                            <p className="text-sm text-[var(--muted-foreground)] italic">
                              No dates found
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Step 6 */}
                      <div className="flex gap-4">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--primary)] text-white flex items-center justify-center font-bold text-sm">
                          6
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-sm text-gray-900 mb-1">Paste Data</h4>
                          <p className="text-sm text-gray-600 mb-1">
                            Navigate to the first data cell in the donations schedule table. Then:
                          </p>
                          <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600 ml-2">
                            <li>Right-click and select <strong>"Paste Special"</strong></li>
                            <li>Choose <strong>"Unformatted Text"</strong></li>
                          </ol>
                        </div>
                      </div>

                      {/* Step 7 */}
                      <div className="flex gap-4">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--primary)] text-white flex items-center justify-center font-bold text-sm">
                          7
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-sm text-gray-900 mb-1">Configure Separator</h4>
                          <p className="text-sm text-gray-600 mb-1">
                            In the "Separator Options" dialog:
                          </p>
                          <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600 ml-2">
                            <li>Select <strong>"Separated by"</strong></li>
                            <li>Check <strong>"Tab"</strong> and click OK</li>
                          </ol>
                        </div>
                      </div>

                      {/* Step 8 */}
                      <div className="flex gap-4">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--primary)] text-white flex items-center justify-center font-bold text-sm">
                          8
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-sm text-gray-900 mb-1">Verify Data</h4>
                          <p className="text-sm text-gray-600 mb-1">
                            Double-check the pasted data:
                          </p>
                          <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 ml-2">
                            <li>All rows present</li>
                            <li>Correct columns</li>
                            <li>Dates in DD/MM/YY</li>
                            <li>Amounts numeric</li>
                          </ul>
                        </div>
                      </div>

                      {/* Step 9 */}
                      <div className="flex gap-4">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--primary)] text-white flex items-center justify-center font-bold text-sm">
                          9
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-sm text-gray-900 mb-1">Save and Upload</h4>
                          <p className="text-sm text-gray-600">
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
                <p className="text-sm text-green-800">
                  <strong>Important:</strong> HMRC only accepts ODS files. Download both the template and CSV, then follow the tutorial above to combine them.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      {data.length > 0 && activeTab === 'active' && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          <StatCard
            title="Total Payments"
            value={totalPaymentCount}
            description={`${totalCount} unique parents`}
            icon={<FileCheck className="h-4 w-4" />}
          />
          <StatCard
            title="Total Amount"
            value={`£${totalAmount.toFixed(2)}`}
            icon={<DollarSign className="h-4 w-4" />}
          />
          <StatCard
            title="Gift Aid Value"
            value={`£${(totalAmount * 0.25).toFixed(2)}`}
            description="25% claimable"
            icon={<Gift className="h-4 w-4 text-green-600" />}
          />
          <StatCard
            title="Data Complete"
            value={`${validationStats.complete}/${validationStats.total}`}
            description={validationStats.missingBoth > 0 ? `${validationStats.missingBoth} missing data` : 'All complete'}
            icon={<FileText className="h-4 w-4" />}
          />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 sm:gap-2 border-b border-[var(--border)] overflow-x-auto pb-0">
        <button
          onClick={() => setActiveTab('active')}
          className={`px-3 sm:px-4 py-2.5 font-medium text-sm transition-all whitespace-nowrap flex items-center gap-2 relative ${
            activeTab === 'active'
              ? 'text-[var(--primary)]'
              : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
          }`}
        >
          <CheckCircle className={`h-4 w-4 ${activeTab === 'active' ? 'text-green-600' : ''}`} />
          <span>Gift Aid Payment Records</span>
          {activeTab === 'active' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--primary)] rounded-t" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('eligible')}
          className={`px-3 sm:px-4 py-2.5 font-medium text-sm transition-all whitespace-nowrap flex items-center gap-2 relative ${
            activeTab === 'eligible'
              ? 'text-[var(--primary)]'
              : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
          }`}
        >
          <Gift className={`h-4 w-4 ${activeTab === 'eligible' ? 'text-green-600' : ''}`} />
          <span>Gift Aid Eligible</span>
          {eligibleData.length > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
              {eligibleData.length}
            </Badge>
          )}
          {activeTab === 'eligible' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--primary)] rounded-t" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-3 sm:px-4 py-2.5 font-medium text-sm transition-all whitespace-nowrap flex items-center gap-2 relative ${
            activeTab === 'pending'
              ? 'text-[var(--primary)]'
              : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
          }`}
        >
          <Clock className={`h-4 w-4 ${activeTab === 'pending' ? 'text-yellow-600' : ''}`} />
          <span>Pending Contact</span>
          {pendingData.length > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
              {pendingData.length}
            </Badge>
          )}
          {activeTab === 'pending' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--primary)] rounded-t" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('declined')}
          className={`px-3 sm:px-4 py-2.5 font-medium text-sm transition-all whitespace-nowrap flex items-center gap-2 relative ${
            activeTab === 'declined'
              ? 'text-[var(--primary)]'
              : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
          }`}
        >
          <XCircle className={`h-4 w-4 ${activeTab === 'declined' ? 'text-red-600' : ''}`} />
          <span>Declined</span>
          {declinedData.length > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
              {declinedData.length}
            </Badge>
          )}
          {activeTab === 'declined' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--primary)] rounded-t" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-3 sm:px-4 py-2.5 font-medium text-sm transition-all whitespace-nowrap flex items-center gap-2 relative ${
            activeTab === 'analytics'
              ? 'text-[var(--primary)]'
              : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
          }`}
        >
          <TrendingUp className={`h-4 w-4 ${activeTab === 'analytics' ? 'text-blue-600' : ''}`} />
          <span>Analytics</span>
          {activeTab === 'analytics' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--primary)] rounded-t" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-3 sm:px-4 py-2.5 font-medium text-sm transition-all whitespace-nowrap flex items-center gap-2 relative ${
            activeTab === 'history'
              ? 'text-[var(--primary)]'
              : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
          }`}
        >
          <History className={`h-4 w-4 ${activeTab === 'history' ? 'text-purple-600' : ''}`} />
          <span>History</span>
          {activeTab === 'history' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--primary)] rounded-t" />
          )}
        </button>
      </div>

      {/* Validation Warning */}
      {data.length > 0 && activeTab === 'active' && validationStats.missingBoth > 0 && (
        <Card className="border-yellow-200 bg-yellow-50/50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-yellow-900 mb-1">Data Validation Warning</h3>
                <p className="text-sm text-yellow-800">
                  {validationStats.missingBoth} entry{validationStats.missingBoth > 1 ? 'ies' : 'y'} {validationStats.missingBoth > 1 ? 'are' : 'is'} missing address or postcode information. 
                  {validationStats.missingAddress > validationStats.missingBoth && ` ${validationStats.missingAddress - validationStats.missingBoth} additional entries are missing addresses.`}
                  {validationStats.missingPostcode > validationStats.missingBoth && ` ${validationStats.missingPostcode - validationStats.missingBoth} additional entries are missing postcodes.`}
                  Please review and complete these fields before submitting to HMRC.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending tab info */}
      {activeTab === 'pending' && pendingData.length > 0 && (
        <Card className="border-[var(--border)] bg-[var(--card)] mt-6">
          <CardContent className="p-4 sm:p-5 lg:p-5">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-[var(--muted)] rounded-lg flex items-center justify-center">
                <Clock className="h-5 w-5 text-[var(--foreground)]" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-[var(--foreground)] mb-1">Contact Parents for Gift Aid</h3>
                <p className="text-sm text-[var(--muted-foreground)]">
                  These parents selected "Not Sure" during setup. Contact them to provide more information 
                  about Gift Aid and update their status. Once updated to "Yes", their payments will appear 
                  in the Active Gift Aid tab.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Declined tab info */}
      {activeTab === 'declined' && declinedData.length > 0 && (
        <Card className="border-gray-200 bg-gray-50/50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <XCircle className="h-5 w-5 text-gray-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">Parents Who Declined Gift Aid</h3>
                <p className="text-sm text-gray-800">
                  These parents have declined Gift Aid. Their payments will not be included in Gift Aid submissions. 
                  If their situation changes, you can approve them using the action button.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
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
                    <p className="text-sm text-muted-foreground">If all pending parents sign up</p>
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
            <div className="space-y-4">
              {/* Title and Description */}
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {activeTab === 'active' ? 'Gift Aid Preview' : activeTab === 'eligible' ? 'Gift Aid Eligible Parents' : activeTab === 'pending' ? 'Parents Pending Contact' : 'Parents Who Declined Gift Aid'}
                </CardTitle>
                <CardDescription className="mt-1">
                  {activeTab === 'active' 
                    ? 'Preview of payments that will be included in the submission file'
                    : activeTab === 'eligible'
                    ? 'Parents who are eligible for Gift Aid'
                    : activeTab === 'pending'
                    ? 'Parents who need to be contacted about Gift Aid'
                    : 'Parents who have declined Gift Aid'}
                </CardDescription>
              </div>

              {/* Search and Bulk Actions */}
              {(activeTab === 'pending' || activeTab === 'eligible') && filteredData.length > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2 border-t border-[var(--border)]">
                  {/* Search */}
                  <div className="relative flex-1 sm:max-w-xs">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
                    <Input
                      placeholder="Search parents..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  {/* Action Buttons */}
                  {selectedParents.size > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleBulkUpdate('YES')}
                        disabled={bulkUpdating || sendingReminders}
                        className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                      >
                        <CheckCircle className="h-3 w-3 mr-1.5" />
                        Approve Selected ({selectedParents.size})
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleSendReminders}
                        disabled={bulkUpdating || sendingReminders}
                        className="border-purple-300 text-purple-700 hover:bg-purple-50"
                      >
                        <Mail className="h-3 w-3 mr-1.5" />
                        {sendingReminders ? 'Sending...' : `Send Reminders (${selectedParents.size})`}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedParents(new Set())}
                        disabled={bulkUpdating || sendingReminders}
                        className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
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
                    : activeTab === 'eligible'
                    ? 'No eligible parents found.'
                    : activeTab === 'pending'
                    ? 'No parents pending contact for the selected date range.'
                    : 'No parents have declined Gift Aid.'
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {activeTab === 'active' && (
                        <>
                          <TableHead>Title</TableHead>
                          <TableHead>First Name</TableHead>
                          <TableHead>Last Name</TableHead>
                          <TableHead>Parent Name</TableHead>
                          <TableHead>House Name/Number</TableHead>
                          <TableHead>Postcode</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </>
                      )}
                      {(activeTab === 'eligible' || activeTab === 'pending' || activeTab === 'declined') && (
                        <>
                          <TableHead>Parent Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Address</TableHead>
                          <TableHead>Postcode</TableHead>
                          <TableHead>Gift Aid Status</TableHead>
                          {(activeTab === 'pending' || activeTab === 'declined') && (
                            <TableHead className="text-center">Actions</TableHead>
                          )}
                        </>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.map((row, index) => (
                      <TableRow 
                        key={row.id}
                        className="cursor-pointer hover:bg-[var(--muted)]/50 transition-colors"
                        onClick={() => handleRowClick(row)}
                      >
                        {activeTab === 'active' && (
                          <>
                            <TableCell className="font-medium">{row.title || '-'}</TableCell>
                            <TableCell>{row.firstName || '-'}</TableCell>
                            <TableCell>{row.lastName || '-'}</TableCell>
                            <TableCell 
                              className="font-medium cursor-pointer hover:text-[var(--primary)] hover:underline transition-colors"
                              onClick={(e) => {
                                if (row.parentUserId) {
                                  handleParentNameClick(e, row)
                                }
                              }}
                            >
                              {row.parentName || 'N/A'}
                            </TableCell>
                            <TableCell>
                              {row.houseNameOrNumber ? (
                                row.houseNameOrNumber
                              ) : (
                                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                                  Missing
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {row.postcode ? (
                                row.postcode
                              ) : (
                                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                                  Missing
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {row.donationDate ? (() => {
                                const date = new Date(row.donationDate)
                                const day = String(date.getDate()).padStart(2, '0')
                                const month = String(date.getMonth() + 1).padStart(2, '0')
                                const year = String(date.getFullYear()).slice(-2)
                                return `${day}/${month}/${year}`
                              })() : '-'}
                            </TableCell>
                            <TableCell className="text-right font-semibold">£{row.amount.toFixed(2)}</TableCell>
                          </>
                        )}
                        {(activeTab === 'eligible' || activeTab === 'pending' || activeTab === 'declined') && row.parentUserId && (
                          <>
                            <TableCell 
                              className="font-medium cursor-pointer hover:text-[var(--primary)] hover:underline transition-colors"
                              onClick={(e) => handleParentNameClick(e, row)}
                            >
                              {row.parentName || 'N/A'}
                            </TableCell>
                            <TableCell>{row.parentEmail || 'N/A'}</TableCell>
                            <TableCell>{row.parentPhone || 'N/A'}</TableCell>
                            <TableCell>
                              {row.houseNameOrNumber ? (
                                row.houseNameOrNumber
                              ) : (
                                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                                  Missing
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {row.postcode ? (
                                row.postcode
                              ) : (
                                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                                  Missing
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {row.giftAidStatus ? (
                                <Badge 
                                  variant="outline" 
                                  className={
                                    row.giftAidStatus === 'ELIGIBLE' || row.giftAidStatus === 'YES'
                                      ? 'bg-green-50 text-green-700 border-green-300'
                                      : row.giftAidStatus === 'NOT_ELIGIBLE' || row.giftAidStatus === 'NO'
                                      ? 'bg-red-50 text-red-700 border-red-300'
                                      : 'bg-yellow-50 text-yellow-700 border-yellow-300'
                                  }
                                >
                                  {row.giftAidStatus === 'ELIGIBLE' || row.giftAidStatus === 'YES' 
                                    ? 'Eligible' 
                                    : row.giftAidStatus === 'NOT_ELIGIBLE' || row.giftAidStatus === 'NO'
                                    ? 'Not Eligible'
                                    : row.giftAidStatus === 'NOT_SURE'
                                    ? 'Not Sure'
                                    : row.giftAidStatus}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-300">
                                  Not Set
                                </Badge>
                              )}
                            </TableCell>
                            {(activeTab === 'pending' || activeTab === 'declined') && (
                              <TableCell onClick={(e) => e.stopPropagation()}>
                                <div className="flex gap-2 justify-center">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleUpdateStatus(row.parentUserId!, 'YES')
                                    }}
                                    disabled={updatingStatus === row.parentUserId}
                                    className="border-green-600 text-green-700 hover:bg-green-50 hover:border-green-700"
                                  >
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Approve
                                  </Button>
                                  {activeTab === 'pending' && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleUpdateStatus(row.parentUserId!, 'NO')
                                      }}
                                      disabled={updatingStatus === row.parentUserId}
                                      className="border-red-600 text-red-700 hover:bg-red-50 hover:border-red-700"
                                    >
                                      <XCircle className="h-3 w-3 mr-1" />
                                      Decline
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            )}
                          </>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Student Detail Modal */}
      <StudentDetailModal
        studentId={selectedStudentId}
        isOpen={isStudentModalOpen}
        initialTab={initialStudentTab}
        onClose={() => {
          setIsStudentModalOpen(false)
          setSelectedStudentId(null)
          setInitialStudentTab('overview') // Reset to default
        }}
      />

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
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date Generated</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Filename</TableHead>
                      <TableHead className="text-right">Total Count</TableHead>
                      <TableHead className="text-right">Total Amount</TableHead>
                      <TableHead className="text-right">Gift Aid Value</TableHead>
                      <TableHead>Generated By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((submission) => (
                      <TableRow key={submission.id}>
                        <TableCell>
                          {new Date(submission.createdAt).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span>{new Date(submission.startDate).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}</span>
                            <span className="text-xs text-[var(--muted-foreground)]">to</span>
                            <span>{new Date(submission.endDate).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-[var(--muted)] px-2 py-1 rounded">{submission.filename}</code>
                        </TableCell>
                        <TableCell className="text-right font-medium">{submission.totalCount}</TableCell>
                        <TableCell className="text-right font-semibold">£{submission.totalAmount.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-semibold text-green-600">£{(submission.totalAmount * 0.25).toFixed(2)}</TableCell>
                        <TableCell>{submission.generatedBy.name || submission.generatedBy.email}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
              <p className="text-sm text-[var(--muted-foreground)]">
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
            <p className="text-sm text-center text-[var(--muted-foreground)]">
              {Math.round(progress)}% complete
            </p>
          </div>
        </div>
      </Modal>
      
      <ConfirmationDialog
        isOpen={showMissingDataConfirm}
        onClose={() => {
          setShowMissingDataConfirm(false)
          setPendingDownload(null)
        }}
        onConfirm={() => {
          if (pendingDownload) {
            setShowMissingDataConfirm(false)
            proceedWithDownload(pendingDownload.data)
            setPendingDownload(null)
          }
        }}
        title="Missing Address Information"
        message={`Warning: ${pendingDownload?.missingCount || 0} entries are missing address or postcode information. The file will still be generated, but you should review and complete these fields before submitting to HMRC. For non-UK donors, the postcode will be set to 'X' automatically. Continue?`}
        confirmText="Continue"
        cancelText="Cancel"
        variant="warning"
      />
    </div>
  )
}
