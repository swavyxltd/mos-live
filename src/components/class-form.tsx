'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar, Clock, MapPin, Users, BookOpen, Save, X } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface ClassFormData {
  name: string
  description: string
  maxStudents: number
  room: string
  schedule: {
    days: string[]
    startTime: string
    endTime: string
  }
  teacherId: string
  monthlyFee: number
}

interface ClassFormProps {
  initialData?: Partial<ClassFormData>
  isEditing?: boolean
  onSubmit: (data: ClassFormData) => Promise<void>
  onCancel: () => void
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

interface Teacher {
  id: string
  name: string
  email: string
}

export function ClassForm({ initialData, isEditing = false, onSubmit, onCancel }: ClassFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [teachers, setTeachers] = React.useState<Teacher[]>([])
  const [isLoadingTeachers, setIsLoadingTeachers] = React.useState(false)
  // Convert monthlyFee from pence to pounds if needed (for initialData that might have monthlyFeeP)
  const getMonthlyFeeInPounds = () => {
    if (initialData?.monthlyFee !== undefined) {
      // If monthlyFee is already in pounds (from edit modal), use it directly
      return initialData.monthlyFee
    }
    if (initialData?.monthlyFeeP !== undefined) {
      // If monthlyFeeP is in pence, convert to pounds
      return initialData.monthlyFeeP / 100
    }
    return 0
  }

  const [formData, setFormData] = React.useState<ClassFormData>({
    name: initialData?.name || '',
    description: initialData?.description || '',
    maxStudents: initialData?.maxStudents || 15,
    room: initialData?.room || '',
    schedule: {
      days: initialData?.schedule?.days || [],
      startTime: initialData?.schedule?.startTime || '4:00 PM',
      endTime: initialData?.schedule?.endTime || '5:00 PM'
    },
    teacherId: initialData?.teacherId || '',
    monthlyFee: getMonthlyFeeInPounds()
  })

  // Fetch teachers on mount
  React.useEffect(() => {
    const fetchTeachers = async () => {
      setIsLoadingTeachers(true)
      try {
        // Fetch only staff members for teacher assignment
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
    fetchTeachers()
  }, [])

  const handleInputChange = (field: keyof ClassFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleScheduleChange = (field: keyof ClassFormData['schedule'], value: any) => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      await onSubmit(formData)
      router.push('/classes')
    } catch (error) {
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            {isEditing ? 'Edit Class' : 'Create New Class'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Information */}
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

          {/* Teacher Assignment */}
          <div className="space-y-2">
            <Label htmlFor="teacher">Assigned Teacher *</Label>
            {isLoadingTeachers ? (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>Loading teachers...</span>
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

          {/* Class Capacity and Room */}
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

          {/* Monthly Fee */}
          <div className="space-y-2">
            <Label htmlFor="monthlyFee">Monthly Fee (£) *</Label>
            <Input
              id="monthlyFee"
              type="number"
              min="0"
              step="0.01"
              value={formData.monthlyFee}
              onChange={(e) => handleInputChange('monthlyFee', parseFloat(e.target.value) || 0)}
              placeholder="e.g., 50"
              required
            />
            <p className="text-sm text-[var(--muted-foreground)]">Enter the fee in pounds (e.g., type 50 for £50.00). Decimals allowed (e.g., 50.50 for £50.50).</p>
          </div>

          {/* Schedule */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              <Label className="text-base font-medium">Schedule</Label>
            </div>
            
            {/* Days of Week */}
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

            {/* Time Slots */}
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
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting || !formData.name || !formData.teacherId || formData.schedule.days.length === 0}>
          <Save className="h-4 w-4 mr-2" />
          {isSubmitting ? 'Saving...' : (isEditing ? 'Update Class' : 'Create Class')}
        </Button>
      </div>
    </form>
  )
}
