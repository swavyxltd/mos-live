'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  BookOpen, 
  Calendar,
  Clock,
  Save,
  X as CloseIcon,
  Loader2,
  DollarSign
} from 'lucide-react'
import { toast } from 'sonner'
import { useUnsavedChangesWarning } from '@/hooks/use-unsaved-changes-warning'

interface Teacher {
  id: string
  name: string
  email: string
}

interface EditClassModalProps {
  classId: string | null
  isOpen: boolean
  onClose: () => void
  onSave: () => void
}

const DAYS_OF_WEEK = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
]

const TIME_SLOTS = [
  '8:00 AM', '8:30 AM', '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM',
  '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM',
  '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM',
  '5:00 PM', '5:30 PM', '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM',
  '8:00 PM', '8:30 PM'
]

export function EditClassModal({ classId, isOpen, onClose, onSave }: EditClassModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [isLoadingTeachers, setIsLoadingTeachers] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    teacherId: '',
    schedule: {
      days: [] as string[],
      startTime: '5:00 PM',
      endTime: '7:00 PM'
    },
    monthlyFee: 0
  })
  const [originalFormData, setOriginalFormData] = useState(formData)

  // Fetch class data and teachers when modal opens
  useEffect(() => {
    if (isOpen && classId) {
      fetchClassData()
      fetchTeachers()
    } else {
      // Reset form when modal closes
      const resetData = {
        name: '',
        description: '',
        teacherId: '',
        schedule: {
          days: [],
          startTime: '5:00 PM',
          endTime: '7:00 PM'
        },
        monthlyFee: 0
      }
      setFormData(resetData)
      setOriginalFormData(resetData)
      setError('')
    }
  }, [isOpen, classId])

  const fetchClassData = async () => {
    if (!classId) return
    
    setIsLoading(true)
    try {
      const response = await fetch(`/api/classes/${classId}`)
      if (response.ok) {
        const data = await response.json()
        
        // Parse schedule
        let parsedSchedule: any = {}
        if (data.schedule) {
          try {
            parsedSchedule = typeof data.schedule === 'string' 
              ? JSON.parse(data.schedule) 
              : data.schedule
          } catch (e) {
            parsedSchedule = {}
          }
        }

        const initialData = {
          name: data.name || '',
          description: data.description || '',
          teacherId: data.teacherId || data.User?.id || '',
          schedule: {
            days: parsedSchedule.days || [],
            startTime: parsedSchedule.startTime || '5:00 PM',
            endTime: parsedSchedule.endTime || '7:00 PM'
          },
          monthlyFee: data.monthlyFeeP ? data.monthlyFeeP / 100 : 0
        }
        setFormData(initialData)
        setOriginalFormData(initialData)
      } else {
        toast.error('Failed to load class data')
      }
    } catch (error) {
      console.error('Failed to fetch class data', error)
      toast.error('Failed to load class data')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchTeachers = async () => {
    setIsLoadingTeachers(true)
    try {
      const response = await fetch('/api/staff')
      if (response.ok) {
        const data = await response.json()
        const teacherList = data.teachers || data.map((t: any) => ({
          id: t.id,
          name: t.name || `${t.firstName || ''} ${t.lastName || ''}`.trim(),
          email: t.email || ''
        })).filter((t: Teacher) => t.name && t.id)
        setTeachers(teacherList)
      }
    } catch (err) {
    } finally {
      setIsLoadingTeachers(false)
    }
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleScheduleChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        [field]: value
      }
    }))
  }

  const toggleDay = (day: string) => {
    setFormData(prev => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        days: prev.schedule.days.includes(day)
          ? prev.schedule.days.filter(d => d !== day)
          : [...prev.schedule.days, day]
      }
    }))
  }

  // Check if there are unsaved changes
  const hasUnsavedChanges = () => {
    if (!isOpen) return false
    return JSON.stringify(formData) !== JSON.stringify(originalFormData)
  }

  // Use the unsaved changes warning hook (only when modal is open)
  const { startSaving, finishSaving } = useUnsavedChangesWarning({
    hasUnsavedChanges,
    enabled: isOpen
  })

  const handleSave = async () => {
    if (!classId) {
      setError('Class ID is missing')
      return
    }

    // Basic validation
    if (!formData.name || formData.name.trim().length === 0) {
      setError('Class name is required')
      return
    }

    if (!formData.teacherId) {
      setError('Please select a teacher')
      return
    }

    if (!formData.schedule.days || formData.schedule.days.length === 0) {
      setError('Please select at least one day for the schedule')
      return
    }

    if (!formData.schedule.startTime || !formData.schedule.endTime) {
      setError('Please select both start and end times')
      return
    }

    setIsSubmitting(true)
    setError('')
    startSaving()

    try {
      // Convert schedule object to string format
      const scheduleString = JSON.stringify({
        days: formData.schedule.days,
        startTime: formData.schedule.startTime,
        endTime: formData.schedule.endTime
      })

      const requestBody = {
        name: formData.name,
        description: formData.description || null,
        schedule: scheduleString,
        teacherId: formData.teacherId || null,
        monthlyFeeP: Math.round(formData.monthlyFee * 100) // Convert to pence
      }

      console.log('Updating class with:', requestBody)

      const response = await fetch(`/api/classes/${classId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      let responseData: any = {}
      try {
        const text = await response.text()
        responseData = text ? JSON.parse(text) : {}
      } catch (parseError) {
        console.error('Failed to parse response:', parseError)
        responseData = { error: 'Invalid response from server' }
      }

      if (!response.ok) {
        console.error('Update failed:', {
          status: response.status,
          statusText: response.statusText,
          responseData
        })
        // Show detailed error message if available
        const errorMessage = responseData.details 
          ? `${responseData.error || 'Failed to update class'}: ${responseData.details}`
          : responseData.error || `Failed to update class (${response.status} ${response.statusText})`
        setError(errorMessage)
        setIsSubmitting(false)
        return
      }

      console.log('Update successful:', responseData)
      toast.success('Class updated successfully')
      onSave()
      handleClose()
    } catch (err) {
      console.error('Error updating class:', err)
      setError('An error occurred. Please try again.')
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setError('')
    setIsSubmitting(false)
    onClose()
  }

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose}
      title="Edit Class"
    >
      <div className="space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--muted-foreground)]" />
          </div>
        ) : (
          <>
            {/* Error message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            {/* Basic Information */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Class Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="e.g., Quran Recitation - Level 1"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Brief description of the class..."
                  rows={3}
                />
              </div>
            </div>

            {/* Teacher Assignment */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="teacher">Assigned Teacher *</Label>
                {isLoadingTeachers ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading teachers...
                  </div>
                ) : (
                  <Select value={formData.teacherId} onValueChange={(value) => handleInputChange('teacherId', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a teacher" />
                    </SelectTrigger>
                    <SelectContent>
                      {teachers.map((teacher) => (
                        <SelectItem key={teacher.id} value={teacher.id}>
                          {teacher.name} {teacher.email ? `(${teacher.email})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            {/* Schedule */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Days of Week *</Label>
                <div className="flex flex-wrap gap-2">
                  {DAYS_OF_WEEK.map((day) => (
                    <Button
                      key={day}
                      type="button"
                      variant={formData.schedule.days.includes(day) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => toggleDay(day)}
                      className="text-sm"
                    >
                      {day.slice(0, 3)}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startTime">Start Time *</Label>
                  <Select 
                    value={formData.schedule.startTime} 
                    onValueChange={(value) => handleScheduleChange('startTime', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_SLOTS.map((time) => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endTime">End Time *</Label>
                  <Select 
                    value={formData.schedule.endTime} 
                    onValueChange={(value) => handleScheduleChange('endTime', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_SLOTS.map((time) => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Fees */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="monthlyFee">Monthly Fee (£) *</Label>
                <Input
                  id="monthlyFee"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.monthlyFee}
                  onChange={(e) => handleInputChange('monthlyFee', parseFloat(e.target.value) || 0)}
                  placeholder="e.g., 25.00"
                  required
                />
                <p className="text-sm text-gray-500">Fixed monthly fee for this class. This will be used when creating payment records.</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-3 pt-4 border-t">
              <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
                <CloseIcon className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSubmitting || !formData.name || !formData.teacherId || formData.schedule.days.length === 0}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Update Class
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}

