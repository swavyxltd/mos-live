'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  GraduationCap,
  Users,
  DollarSign
} from 'lucide-react'
import { toast } from 'sonner'

interface Teacher {
  id: string
  name: string
  email: string
}

interface AddClassModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (classData: any) => void
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

export function AddClassModal({ isOpen, onClose, onSave }: AddClassModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [isLoadingTeachers, setIsLoadingTeachers] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    grade: '',
    teacherId: '',
    maxStudents: 15,
    room: '',
    schedule: {
      days: [] as string[],
      startTime: '5:00 PM',
      endTime: '7:00 PM'
    },
    monthlyFee: 0,
    feeDueDay: 1
  })

  // Fetch teachers when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchTeachers()
    }
  }, [isOpen])

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

  const handleSave = async () => {
    // Basic validation
    if (!formData.name || !formData.teacherId || formData.schedule.days.length === 0) {
      setError('Please fill in all required fields (Class Name, Teacher, and at least one day).')
      return
    }

    if (!formData.schedule.startTime || !formData.schedule.endTime) {
      setError('Please select both start and end times.')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      // Convert schedule object to string format
      const scheduleString = JSON.stringify({
        days: formData.schedule.days,
        startTime: formData.schedule.startTime,
        endTime: formData.schedule.endTime
      })

      const response = await fetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || null,
          schedule: scheduleString,
          teacherId: formData.teacherId || null,
          monthlyFeeP: Math.round(formData.monthlyFee * 100), // Convert to pence
          feeDueDay: formData.feeDueDay || null
        })
      })

      if (!response.ok) {
        const error = await response.json()
        setError(error.error || 'Failed to create class')
        setIsSubmitting(false)
        return
      }

      const data = await response.json()
      
      // Trigger dashboard refresh
      window.dispatchEvent(new CustomEvent('refresh-dashboard'))
      if (window.location.pathname.startsWith('/owner/')) {
        window.dispatchEvent(new CustomEvent('refresh-owner-dashboard'))
      }
      
      toast.success('Class created successfully')
      onSave(data.class)
      handleClose()
    } catch (err) {
      setError('An error occurred. Please try again.')
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setFormData({
      name: '',
      description: '',
      grade: '',
      teacherId: '',
      maxStudents: 15,
      room: '',
      schedule: {
        days: [],
        startTime: '5:00 PM',
        endTime: '7:00 PM'
      },
      monthlyFee: 0,
      feeDueDay: 1
    })
    setError('')
    setIsSubmitting(false)
    onClose()
  }

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose}
      title="Add New Class"
      className="max-w-4xl"
    >
      <div className="space-y-6">
        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Class Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
              <div className="space-y-2">
                <Label htmlFor="grade">Grade Level</Label>
                <Input
                  id="grade"
                  value={formData.grade}
                  onChange={(e) => handleInputChange('grade', e.target.value)}
                  placeholder="e.g., 1-3, 4-6, 7-9"
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
          </CardContent>
        </Card>

        {/* Teacher Assignment */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              Teacher Assignment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="maxStudents">Maximum Students</Label>
                <Input
                  id="maxStudents"
                  type="number"
                  min="1"
                  max="50"
                  value={formData.maxStudents}
                  onChange={(e) => handleInputChange('maxStudents', parseInt(e.target.value) || 15)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="room">Room</Label>
                <Input
                  id="room"
                  value={formData.room}
                  onChange={(e) => handleInputChange('room', e.target.value)}
                  placeholder="e.g., Room A, Hall 1"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Schedule */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
                    className="text-xs"
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
          </CardContent>
        </Card>

        {/* Fees */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Fees
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
              <p className="text-xs text-gray-500">Fixed monthly fee for this class. This will be used when creating payment records.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="feeDueDay">Fee Due Day (Day of Month) *</Label>
              <Input
                id="feeDueDay"
                type="number"
                min="1"
                max="31"
                value={formData.feeDueDay}
                onChange={(e) => handleInputChange('feeDueDay', parseInt(e.target.value) || 1)}
                placeholder="e.g., 1 (for 1st of each month)"
                required
              />
              <p className="text-xs text-gray-500">Day of the month when fees are due. Payments not received within 48 hours will be marked as late, and after 96 hours as overdue.</p>
            </div>
          </CardContent>
        </Card>

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
                Creating...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Create Class
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

