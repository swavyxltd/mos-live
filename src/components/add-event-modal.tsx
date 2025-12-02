'use client'

import { useState, useEffect, useMemo } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Modal } from '@/components/ui/modal'
import { Calendar, Clock, GraduationCap, User, Search } from 'lucide-react'

interface AddEventModalProps {
  onEventAdded?: (event: any) => void
  trigger?: React.ReactNode
}

interface Class {
  id: string
  name: string
}

interface Student {
  id: string
  firstName: string
  lastName: string
  primaryParentId: string
}

export function AddEventModal({ onEventAdded, trigger }: AddEventModalProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [classes, setClasses] = useState<Class[]>([])
  const [loadingClasses, setLoadingClasses] = useState(false)
  const [students, setStudents] = useState<Student[]>([])
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [studentSearch, setStudentSearch] = useState('')
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'EVENT',
    date: '',
    endDate: '', // For holidays with date ranges
    startTime: '',
    endTime: '',
    classId: 'all', // Changed from teacher to classId
    studentId: '', // For meeting events
    allDay: false
  })

  const eventTypes = [
    { value: 'EXAM', label: 'Exam' },
    { value: 'HOLIDAY', label: 'Holiday' },
    { value: 'MEETING', label: 'Meeting' },
    { value: 'EVENT', label: 'Event' }
  ]

  const isHoliday = formData.type === 'HOLIDAY'
  const isMeeting = formData.type === 'MEETING'

  // Filter students based on search - use useMemo to ensure it updates
  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return students
    const searchLower = studentSearch.toLowerCase().trim()
    return students.filter((student) => {
      const fullName = `${student.firstName} ${student.lastName}`.toLowerCase()
      return fullName.includes(searchLower) || 
             student.firstName.toLowerCase().includes(searchLower) ||
             student.lastName.toLowerCase().includes(searchLower)
    })
  }, [students, studentSearch])

  // Fetch classes when modal opens (for non-holiday events)
  useEffect(() => {
    if (open && !isHoliday) {
      fetchClasses()
    }
  }, [open, isHoliday])

  // Fetch students when modal opens and type is MEETING
  useEffect(() => {
    if (open && isMeeting) {
      fetchStudents()
    }
  }, [open, isMeeting])

  // Clear selected student if it's not in filtered results
  useEffect(() => {
    if (isMeeting && formData.studentId && studentSearch.trim()) {
      const isSelectedInFiltered = filteredStudents.some(s => s.id === formData.studentId)
      if (!isSelectedInFiltered) {
        setFormData(prev => ({ ...prev, studentId: '' }))
      }
    }
  }, [studentSearch, isMeeting, formData.studentId, filteredStudents])

  const fetchClasses = async () => {
    setLoadingClasses(true)
    try {
      const response = await fetch('/api/classes')
      if (response.ok) {
        const data = await response.json()
        setClasses(data.map((cls: any) => ({
          id: cls.id,
          name: cls.name
        })))
      }
    } catch (error) {
      console.error('Error fetching classes:', error)
    } finally {
      setLoadingClasses(false)
    }
  }

  const fetchStudents = async () => {
    setLoadingStudents(true)
    try {
      const response = await fetch('/api/students?status=ACTIVE')
      if (response.ok) {
        const data = await response.json()
        const mappedStudents = data.map((student: any) => ({
          id: student.id,
          firstName: student.firstName,
          lastName: student.lastName,
          primaryParentId: student.primaryParentId
        }))
        setStudents(mappedStudents)
        console.log('Fetched students:', mappedStudents.length)
      } else {
        console.error('Failed to fetch students:', response.status)
      }
    } catch (error) {
      console.error('Error fetching students:', error)
    } finally {
      setLoadingStudents(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // In demo mode, just add to local state
      const { isDemoMode } = await import('@/lib/demo-mode')
      
      if (isDemoMode()) {
        const newEvent = {
          id: `demo-event-${Date.now()}`,
          title: formData.title,
          description: formData.description,
          type: formData.type,
          date: new Date(formData.date + (formData.startTime ? 'T' + formData.startTime : '')),
          endDate: formData.endDate ? new Date(formData.endDate) : undefined,
          startTime: formData.allDay ? 'All Day' : formData.startTime,
          endTime: formData.allDay ? 'All Day' : formData.endTime,
          classId: formData.classId || null,
          allDay: formData.allDay
        }

        onEventAdded?.(newEvent)
        setOpen(false)
        resetForm()
      } else {
        // In production, make API call to create event
        // For holidays, we need to create a holiday record instead of an event
        if (isHoliday) {
          const response = await fetch('/api/holidays', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
            body: JSON.stringify({
              name: formData.title,
              startDate: formData.date,
              endDate: formData.endDate || formData.date, // Use endDate if provided, otherwise same as start
            }),
        })

        if (response.ok) {
            const newHoliday = await response.json()
            onEventAdded?.(newHoliday)
            setOpen(false)
            resetForm()
          } else {
            const error = await response.json().catch(() => ({ error: 'Failed to create holiday' }))
            console.error('Error creating holiday:', error)
            toast.error(error.error || 'Failed to create holiday')
          }
        } else {
          // For meetings, validate student is selected
          if (isMeeting && !formData.studentId) {
            toast.error('Please select a student for the meeting')
            setLoading(false)
            return
          }

          const requestBody = {
            title: formData.title,
            description: formData.description,
            type: formData.type,
            date: formData.date,
            startTime: formData.allDay ? null : formData.startTime,
            endTime: formData.allDay ? null : formData.endTime,
            allDay: formData.allDay,
            classId: formData.classId === 'all' || !formData.classId ? null : formData.classId, // null means visible to all accounts in the org, otherwise specific class
            studentId: isMeeting ? formData.studentId : null // For meetings, associate with student
          }
          
          console.log('Submitting event with data:', requestBody)
          console.log('Form data state:', formData)
          
          const response = await fetch('/api/events', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
          })

          if (!response.ok) {
            let errorMessage = 'Failed to create event'
            try {
              const responseText = await response.text()
              console.log('API Error Response status:', response.status)
              console.log('API Error Response headers:', Object.fromEntries(response.headers.entries()))
              console.log('API Error Response body (raw):', responseText)
              console.log('API Error Response body length:', responseText.length)
              
              if (responseText && responseText.trim()) {
                try {
                  const errorData = JSON.parse(responseText)
                  console.error('Error response data (parsed):', errorData)
                  console.error('Error response keys:', Object.keys(errorData))
                  errorMessage = errorData.error || errorData.message || errorData.details || JSON.stringify(errorData) || errorMessage
                } catch (parseError) {
                  console.error('Failed to parse JSON:', parseError)
                  errorMessage = `Failed to create event (Status: ${response.status}): ${responseText.substring(0, 100)}`
                }
              } else {
                errorMessage = `Failed to create event (Status: ${response.status} - Empty response body)`
              }
            } catch (e) {
              console.error('Error reading error response:', e)
              errorMessage = `Failed to create event (Status: ${response.status})`
            }
            toast.error(errorMessage)
            setLoading(false)
            return
          }

          try {
          const newEvent = await response.json()
          onEventAdded?.(newEvent)
          setOpen(false)
          resetForm()
          } catch (e) {
            console.error('Error parsing success response:', e)
            toast.error('Event created but failed to parse response')
          }
        }
      }
    } catch (error) {
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      type: 'EVENT',
      date: '',
      endDate: '',
      startTime: '',
      endTime: '',
      classId: 'all',
      studentId: '',
      allDay: false
    })
    setStudentSearch('')
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  return (
    <>
      {trigger || (
        <Button onClick={() => setOpen(true)}>
          <Calendar className="h-4 w-4 mr-2" />
          Add Event
        </Button>
      )}
      <Modal isOpen={open} onClose={() => setOpen(false)} title="Add New Event">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title and Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm font-medium">
                Event Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="e.g. Eid al-Fitr, Mid-Term Exam"
                required
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type" className="text-sm font-medium">
                Event Type <span className="text-red-500">*</span>
              </Label>
              <Select value={formData.type} onValueChange={(value) => handleInputChange('type', value)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select event type" />
                </SelectTrigger>
                <SelectContent>
                  {eventTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">
              Description
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Provide additional details about the event..."
              rows={4}
              className="resize-none"
            />
          </div>

          {/* Date Fields - Different for holidays vs other events */}
          {isHoliday ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label htmlFor="date" className="text-sm font-medium">
                  Start Date <span className="text-red-500">*</span>
                </Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => handleInputChange('date', e.target.value)}
                required
                  className="w-full cursor-pointer"
              />
            </div>
            <div className="space-y-2">
                <Label htmlFor="endDate" className="text-sm font-medium">
                  End Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => handleInputChange('endDate', e.target.value)}
                  required
                  min={formData.date}
                  className="w-full cursor-pointer"
                />
                <p className="text-xs text-[var(--muted-foreground)]">
                  Holidays can span multiple days
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date" className="text-sm font-medium">
                    Date <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => handleInputChange('date', e.target.value)}
                    required
                    className="w-full cursor-pointer"
                  />
                </div>
                <div className="space-y-2 flex items-end">
                  <Label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.allDay}
                  onChange={(e) => handleInputChange('allDay', e.target.checked)}
                      className="rounded border-[var(--border)]"
                />
                    <span className="text-sm font-medium">All Day Event</span>
              </Label>
            </div>
          </div>

          {!formData.allDay && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                    <Label htmlFor="startTime" className="text-sm font-medium">
                      Start Time
                    </Label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
                <Input
                  id="startTime"
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => handleInputChange('startTime', e.target.value)}
                        className="pl-10"
                />
                    </div>
              </div>
              <div className="space-y-2">
                    <Label htmlFor="endTime" className="text-sm font-medium">
                      End Time
                    </Label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
                <Input
                  id="endTime"
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => handleInputChange('endTime', e.target.value)}
                        className="pl-10"
                />
              </div>
            </div>
                </div>
              )}
            </>
          )}

          {/* Student - Only show for meeting events */}
          {isMeeting && (
            <div className="space-y-2">
              <Label htmlFor="studentId" className="text-sm font-medium">
                Student <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)] z-10" />
                <Select 
                  value={formData.studentId} 
                  onValueChange={(value) => {
                    handleInputChange('studentId', value)
                    setStudentSearch('') // Clear search when student is selected
                  }}
                  disabled={loadingStudents}
                  required
                >
                  <SelectTrigger className="pl-10 w-full">
                    <SelectValue placeholder={loadingStudents ? "Loading students..." : "Search and select student..."} />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {/* Search input inside dropdown */}
                    <div className="sticky top-0 z-10 bg-[var(--popover)] border-b border-[var(--border)] p-2">
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
              <Input
                          type="text"
                          placeholder="Search students..."
                          value={studentSearch}
                          onChange={(e) => {
                            e.stopPropagation()
                            setStudentSearch(e.target.value)
                          }}
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                          className="pl-8 h-8 text-sm"
                          autoFocus
                        />
                      </div>
                    </div>
                    {/* Filtered student list */}
                    <div className="max-h-[240px] overflow-y-auto">
                      {filteredStudents.length > 0 ? (
                        filteredStudents.map((student) => (
                          <SelectItem key={student.id} value={student.id}>
                            {student.firstName} {student.lastName}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="px-2 py-6 text-sm text-[var(--muted-foreground)] text-center">
                          {studentSearch.trim() ? `No students found matching "${studentSearch}"` : 'No students available'}
                        </div>
                      )}
                    </div>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-[var(--muted-foreground)]">
                The meeting will be added to this student's parent's calendar and they will be notified via email and announcement
              </p>
            </div>
          )}

          {/* Class - Only show class dropdown for non-holiday, non-meeting events */}
          {!isHoliday && !isMeeting && (
            <div className="space-y-2">
              <Label htmlFor="classId" className="text-sm font-medium">
                Class
              </Label>
              <div className="relative">
                <GraduationCap className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)] z-10" />
                <Select 
                  value={formData.classId} 
                  onValueChange={(value) => handleInputChange('classId', value)}
                  disabled={loadingClasses}
                >
                  <SelectTrigger className="pl-10">
                    <SelectValue placeholder={loadingClasses ? "Loading classes..." : "Select class (optional)"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Classes</SelectItem>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-[var(--muted-foreground)]">
                Leave as "All Classes" to make event visible to everyone
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => {
                setOpen(false)
                resetForm()
              }}
              className="min-w-[100px]"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              className="min-w-[120px]"
            >
              {loading ? 'Creating...' : 'Create Event'}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  )
}
