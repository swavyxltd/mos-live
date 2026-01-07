'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { CheckCircle, XCircle, Clock, User, Loader2, ArrowLeft, Users as UsersIcon, Info, UserCheck, Calendar as CalendarIcon } from 'lucide-react'
import { useState, useEffect, useCallback, useRef } from 'react'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Student {
  id: string
  name: string
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'UNMARKED'
  time?: string
}

interface Class {
  id: string
  name: string
  teacher: string
  students: Student[]
}

interface AttendanceMarkingProps {
  initialOpen?: boolean
  initialClassId?: string | null
  onClose?: () => void
}

export function AttendanceMarking({ initialOpen = false, initialClassId = null, onClose }: AttendanceMarkingProps) {
  const [isOpen, setIsOpen] = useState(initialOpen)
  const [selectedClass, setSelectedClass] = useState<Class | null>(null)
  const [classes, setClasses] = useState<Class[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  
  // Get today's date in YYYY-MM-DD format for default
  const getTodayDateString = () => {
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  
  // Selected date for attendance marking (defaults to today, but can be changed to past dates)
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString())
  const hasFetchedRef = useRef(false)
  const previousDateRef = useRef<string>(getTodayDateString())
  const datePickerOpenRef = useRef(false)
  const datePickerValueRef = useRef<string>(getTodayDateString()) // Track the value when picker opens
  
  // Get selected date in YYYY-MM-DD format
  const getSelectedDate = () => {
    return selectedDate
  }
  
  // Format date for display
  const getFormattedDate = () => {
    return formatDate(selectedDate)
  }

  const fetchClasses = useCallback(async (force = false) => {
    if (hasFetchedRef.current && !force) return
    if (force) {
      hasFetchedRef.current = false // Reset flag when forcing refresh
    }
    hasFetchedRef.current = true
    
    setLoading(true)
    try {
      // Fetch all classes
      const classesResponse = await fetch('/api/classes')
      
      if (!classesResponse.ok) {
        throw new Error('Failed to fetch classes')
      }
      const classesData = await classesResponse.json()

      // Fetch all class details and attendance in parallel using optimized endpoint
      const classesWithStudents = await Promise.all(
        classesData.map(async (cls: any) => {
          try {
            // Use optimized endpoint that fetches class + students + attendance in one call
            const targetDate = getSelectedDate()
            const classAttendanceResponse = await fetch(
              `/api/attendance/class/${cls.id}?date=${targetDate}`
            )

            if (!classAttendanceResponse.ok) {
              const errorData = await classAttendanceResponse.json().catch(() => ({}))
              console.error(`Failed to fetch attendance for class ${cls.id}:`, {
                status: classAttendanceResponse.status,
                error: errorData.error || 'Unknown error',
                details: errorData.details
              })
              
              // Fallback: Try to get class details from the regular class endpoint
              try {
                const classResponse = await fetch(`/api/classes/${cls.id}`)
                if (classResponse.ok) {
                  const classData = await classResponse.json()
                  const students = (classData.StudentClass || [])
                    .filter((sc: any) => {
                      const student = sc.Student || sc.student
                      return student && !student.isArchived
                    })
                    .map((sc: any) => {
                      const student = sc.Student || sc.student
                      // Auto-mark as PRESENT with current time
                      const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      return {
                        id: student.id,
                        name: `${student.firstName} ${student.lastName}`,
                        status: 'PRESENT' as const,
                        time: currentTime
                      }
                    })
                  
                  return {
                    id: classData.id || cls.id,
                    name: classData.name || cls.name,
                    teacher: classData.User?.name || 'Unassigned',
                    students
                  }
                }
              } catch (fallbackError) {
                console.error(`Fallback also failed for class ${cls.id}:`, fallbackError)
              }
              
              // Return class with empty students array as last resort
              return {
                id: cls.id,
                name: cls.name || 'Unknown Class',
                teacher: 'Unknown',
                students: []
              }
            }

            const classAttendanceData = await classAttendanceResponse.json()

            // Check if response has the expected structure
            if (!classAttendanceData) {
              console.error(`Invalid response structure for class ${cls.id}:`, classAttendanceData)
              // Return class with empty students array instead of null
              return {
                id: cls.id,
                name: cls.name || 'Unknown Class',
                teacher: 'Unknown',
                students: []
              }
            }

            // Ensure students array exists (default to empty if missing)
            if (!Array.isArray(classAttendanceData.students)) {
              console.warn(`Class ${cls.id} has invalid students array, defaulting to empty`)
              classAttendanceData.students = []
            }

            // Transform students from the optimized endpoint response
            // Auto-mark as PRESENT if UNMARKED, and record time
            const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            const studentsWithStatus: Student[] = (classAttendanceData.students || []).map((student: any) => {
              // If student is UNMARKED, default to PRESENT with current time
              if (student.status === 'UNMARKED' || !student.status) {
                return {
                  id: student.id,
                  name: student.name,
                  status: 'PRESENT' as const,
                  time: currentTime
                }
              }
              // If already marked, preserve existing status and time
              return {
                id: student.id,
                name: student.name,
                status: student.status,
                time: student.time
              }
            })

            return {
              id: classAttendanceData.id,
              name: classAttendanceData.name,
              teacher: classAttendanceData.teacher || 'Unassigned',
              students: studentsWithStatus
            }
          } catch (error: any) {
            console.error(`Error fetching class ${cls.id}:`, error?.message || error)
            // Return class with empty students instead of null
            return {
              id: cls.id,
              name: cls.name || 'Unknown Class',
              teacher: 'Unknown',
              students: []
            }
          }
        })
      )

      // Filter out null values (keep classes even if they have no students)
      const validClasses = classesWithStudents.filter(
        (cls): cls is Class => cls !== null
      )

      if (validClasses.length === 0) {
        console.warn('No classes found or all classes failed to load')
      }

      // Log attendance counts for debugging
      validClasses.forEach(cls => {
        const presentCount = cls.students.filter(s => s.status === 'PRESENT').length
        const absentCount = cls.students.filter(s => s.status === 'ABSENT').length
        const lateCount = cls.students.filter(s => s.status === 'LATE').length
        if (presentCount > 0 || absentCount > 0 || lateCount > 0) {
          console.log(`Class ${cls.name}: ${presentCount} present, ${absentCount} absent, ${lateCount} late`)
        }
      })

      setClasses(validClasses)
    } catch (error) {
      console.error('Error fetching classes:', error)
      hasFetchedRef.current = false // Reset on error so we can retry
    } finally {
      setLoading(false)
    }
  }, [selectedDate])

  // Sync with external initialOpen prop
  useEffect(() => {
    if (initialOpen !== undefined && initialOpen !== isOpen) {
      setIsOpen(initialOpen)
    }
  }, [initialOpen])

  // Fetch classes and students when modal opens or date changes
  useEffect(() => {
    if (isOpen) {
      // DO NOT fetch if date picker is currently open - wait until date is actually selected
      if (datePickerOpenRef.current) {
        // Picker is open, don't fetch anything - user is just navigating months/years
        // This prevents any data loading while navigating
        return
      }
      
      // Only fetch if date actually changed and picker is closed
      const dateChanged = previousDateRef.current !== selectedDate
      if (dateChanged || !hasFetchedRef.current) {
        previousDateRef.current = selectedDate
        fetchClasses(true)
      }
    }
    // Reset fetch flag when modal closes
    if (!isOpen) {
      hasFetchedRef.current = false
      previousDateRef.current = getTodayDateString()
      datePickerOpenRef.current = false
      datePickerValueRef.current = getTodayDateString()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, selectedDate])

  // Auto-select class if initialClassId is provided
  useEffect(() => {
    if (isOpen && initialClassId && classes.length > 0) {
      const classToSelect = classes.find(cls => cls.id === initialClassId)
      if (classToSelect && (!selectedClass || selectedClass.id !== initialClassId)) {
        setSelectedClass(classToSelect)
      }
    }
  }, [isOpen, initialClassId, classes, selectedClass])

  // Update selected class when classes are refreshed (e.g., after saving attendance)
  useEffect(() => {
    if (selectedClass && classes.length > 0) {
      const updatedClass = classes.find(cls => cls.id === selectedClass.id)
      if (updatedClass) {
        // Only update if the data has actually changed to avoid unnecessary re-renders
        const hasChanged = JSON.stringify(updatedClass.students) !== JSON.stringify(selectedClass.students)
        if (hasChanged) {
          setSelectedClass(updatedClass)
        }
      }
    }
  }, [classes, selectedClass])

  const handleMarkAttendance = () => {
    setIsOpen(true)
  }

  const handleClassSelect = (classItem: Class) => {
    setSelectedClass(classItem)
  }

  const handleStudentStatusChange = (studentId: string, status: 'PRESENT' | 'ABSENT' | 'LATE') => {
    if (!selectedClass) return

    const updatedClasses = classes.map(cls => {
      if (cls.id === selectedClass.id) {
        return {
          ...cls,
          students: cls.students.map(student => {
            if (student.id === studentId) {
              const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              
              // Always record time for PRESENT and LATE, clear time for ABSENT
              return {
                ...student,
                status,
                time: status === 'ABSENT' 
                  ? undefined 
                  : (status === 'PRESENT' || status === 'LATE')
                    ? currentTime // Always record current time for PRESENT/LATE
                    : student.time // Fallback (shouldn't happen)
              }
            }
            return student
          })
        }
      }
      return cls
    })

    setClasses(updatedClasses)
    setSelectedClass(updatedClasses.find(cls => cls.id === selectedClass.id) || null)
  }

  const handleSaveAttendance = async () => {
    if (!selectedClass) return

    setSaving(true)
    try {
      // Prepare attendance records - API expects classId, date, and attendance array
      // Since all students are auto-marked as PRESENT, include all students
      const attendanceRecords = selectedClass.students
        .map(student => ({
          studentId: student.id,
          status: student.status
        }))

      if (attendanceRecords.length === 0) {
        toast.error('No students to mark attendance for.')
        setSaving(false)
        return
      }

      // Save attendance via bulk API - format: { classId, date, attendance: [...] }
      const response = await fetch('/api/attendance/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          classId: selectedClass.id,
          date: getSelectedDate(),
          attendance: attendanceRecords
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save attendance')
      }

      // Check if any students were already marked (have existing attendance records)
      // We check by seeing if any student has a status other than PRESENT (meaning they were changed)
      // or if all are PRESENT, check if they were loaded with existing attendance
      const wasAlreadyMarked = selectedClass.students.some(s => 
        s.status === 'ABSENT' || s.status === 'LATE'
      ) || selectedClass.students.every(s => s.status === 'PRESENT' && s.time)
      
      // Show success message first
      toast.success(wasAlreadyMarked ? 'Attendance updated successfully!' : 'Attendance saved successfully!')
      
      // Small delay to ensure API has processed the save
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Refresh classes to get updated attendance for the selected date
      await fetchClasses(true)
      
      // Update selected class with fresh data - use a small delay to ensure state is updated
      setTimeout(() => {
        // This will be handled by the useEffect that watches classes
      }, 100)
      
      // Trigger page refresh to update attendance page and dashboard
      if (typeof window !== 'undefined') {
        // Dispatch events for all components listening
        window.dispatchEvent(new CustomEvent('attendance-saved'))
        // Trigger dashboard refresh to update to-do list
        window.dispatchEvent(new CustomEvent('refresh-dashboard'))
        // Note: Individual components will handle their own refresh using router.refresh()
        // This provides smoother UX without full page reloads
      }
      
      // Close modal after refresh completes
      setIsOpen(false)
      setSelectedClass(null)
    } catch (error: any) {
      console.error('Error saving attendance:', error)
      toast.error(error.message || 'Failed to save attendance. Please try again.')
    } finally {
      setSaving(false)
    }
  }


  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PRESENT':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'ABSENT':
        return <XCircle className="h-5 w-5 text-red-600" />
      case 'LATE':
        return <Clock className="h-5 w-5 text-yellow-600" />
      default:
        return <User className="h-5 w-5 text-[var(--muted-foreground)]" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PRESENT':
        return <Badge className="bg-green-50 text-green-700 border-green-200 border-0">Present</Badge>
      case 'ABSENT':
        return <Badge className="bg-red-50 text-red-700 border-red-200 border-0">Absent</Badge>
      case 'LATE':
        return <Badge className="bg-yellow-50 text-yellow-700 border-yellow-200 border-0">Late</Badge>
      default:
        return <Badge variant="outline" className="text-[var(--muted-foreground)]">Unmarked</Badge>
    }
  }

  return (
    <>
      {/* Button to open modal */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2"
        >
          <UserCheck className="h-4 w-4" />
          <span>Mark Attendance</span>
        </Button>
      )}
      
      {/* Attendance Marking Modal */}
      <Modal
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false)
          setSelectedClass(null)
          if (onClose) {
            onClose()
          }
        }}
        title={selectedClass ? selectedClass.name : 'Mark Attendance'}
        className="max-w-5xl"
      >
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--muted-foreground)] mb-3" />
            <p className="text-sm text-[var(--muted-foreground)]">Loading classes...</p>
          </div>
        ) : !selectedClass ? (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
              <p className="text-sm text-[var(--muted-foreground)]">Select a class to mark attendance</p>
              <div className="flex items-center gap-2">
                <Label htmlFor="attendance-date" className="text-sm font-medium text-[var(--muted-foreground)]">
                  Date:
                </Label>
                <div 
                  className="relative flex items-center"
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <Input
                    id="attendance-date"
                    type="date"
                    value={selectedDate}
                    onChange={(e) => {
                      const newDate = e.target.value
                      // onChange ONLY fires when a date is actually clicked/selected (not when navigating months)
                      // This is the ONLY place we should update the date
                      if (newDate !== selectedDate && newDate) {
                        // Date was actually selected - close picker FIRST, then update
                        // Close picker immediately to allow useEffect to run
                        datePickerOpenRef.current = false
                        datePickerValueRef.current = newDate
                        // Update date - this will trigger useEffect which will now fetch
                        setSelectedDate(newDate)
                        // Reset selected class when date changes to force refresh
                        setSelectedClass(null)
                      }
                    }}
                    onFocus={(e) => {
                      // Mark date picker as open when input is focused
                      // This blocks useEffect from fetching while picker is open
                      datePickerOpenRef.current = true
                      datePickerValueRef.current = e.target.value || selectedDate
                      e.stopPropagation()
                    }}
                    onBlur={(e) => {
                      // Check if value changed - if not, user just navigated months and clicked away
                      // Only close picker if value hasn't changed (meaning no date was selected)
                      setTimeout(() => {
                        const currentValue = e.target.value
                        // If value is the same as when picker opened, no date was selected
                        if (currentValue === datePickerValueRef.current) {
                          datePickerOpenRef.current = false
                        }
                        // If value changed, onChange should have already handled it and closed the picker
                        // But just in case, close it here too
                        else if (currentValue !== datePickerValueRef.current) {
                          datePickerOpenRef.current = false
                        }
                      }, 300)
                    }}
                    max={getTodayDateString()} // Can't select future dates
                    className="pl-10 pr-3 w-full sm:w-auto cursor-pointer hover:border-[var(--ring)] focus:border-[var(--ring)] focus:ring-2 focus:ring-[var(--ring)] transition-all"
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      const input = document.getElementById('attendance-date') as HTMLInputElement
                      if (input) {
                        input.showPicker?.() || input.focus()
                      }
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="absolute left-2 top-1/2 transform -translate-y-1/2 p-1.5 hover:bg-[var(--muted)] rounded transition-colors active:scale-95 z-10"
                    aria-label="Open calendar"
                    title="Click to open calendar"
                  >
                    <CalendarIcon className="h-4 w-4 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors" />
                  </button>
                </div>
              </div>
            </div>
            {classes.length === 0 ? (
              <div className="text-center py-12">
                <UsersIcon className="h-12 w-12 text-[var(--muted-foreground)] mx-auto mb-3 opacity-50" />
                <p className="text-sm text-[var(--muted-foreground)]">No classes with students found.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[...classes]
                  .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
                  .map((classItem) => {
                  const presentCount = classItem.students.filter(s => s.status === 'PRESENT').length
                  const absentCount = classItem.students.filter(s => s.status === 'ABSENT').length
                  const lateCount = classItem.students.filter(s => s.status === 'LATE').length
                  const totalCount = classItem.students.length
                  const markedCount = presentCount + absentCount + lateCount
                  return (
                    <Card
                      key={classItem.id}
                      className="cursor-pointer hover:shadow-md transition-all hover:border-[var(--primary)]/50"
                      onClick={() => handleClassSelect(classItem)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg font-semibold text-[var(--foreground)] mb-1">
                              {classItem.name}
                            </CardTitle>
                            <p className="text-sm text-[var(--muted-foreground)]">
                              Teacher: {classItem.teacher}
                            </p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                            <UsersIcon className="h-4 w-4" />
                            <span>{totalCount} {totalCount === 1 ? 'student' : 'students'}</span>
                          </div>
                          <Badge variant={markedCount === totalCount ? 'default' : 'outline'} className="text-xs">
                            {markedCount}/{totalCount} marked
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header with class info and back button */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[var(--border)]">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-[var(--foreground)]">{selectedClass.name}</h3>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--muted-foreground)]">
                  <span>Teacher: {selectedClass.teacher}</span>
                  <span>•</span>
                  <div className="flex items-center gap-2">
                    <span>Date:</span>
                    <div 
                      className="relative flex items-center"
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      <Input
                        type="date"
                        id="attendance-date-detail"
                        value={selectedDate}
                        onChange={(e) => {
                          const newDate = e.target.value
                          // onChange ONLY fires when a date is actually clicked/selected (not when navigating months)
                          // This is the ONLY place we update the date - no other handler should touch it
                          if (newDate && newDate !== selectedDate) {
                            // Close picker FIRST before updating to allow useEffect to run
                            datePickerOpenRef.current = false
                            datePickerValueRef.current = newDate
                            // Now update the date - this will trigger useEffect
                            setSelectedDate(newDate)
                            // Don't call fetchClasses directly - let useEffect handle it
                          }
                        }}
                        onFocus={(e) => {
                          // Mark date picker as open when input is focused
                          // This blocks useEffect from fetching while picker is open
                          datePickerOpenRef.current = true
                          datePickerValueRef.current = e.target.value || selectedDate
                          e.stopPropagation()
                        }}
                        onBlur={(e) => {
                          // Check if value changed - if not, user just navigated months and clicked away
                          // Only close picker if value hasn't changed (meaning no date was selected)
                          setTimeout(() => {
                            const currentValue = e.target.value
                            // If value is the same as when picker opened, no date was selected
                            if (currentValue === datePickerValueRef.current) {
                              datePickerOpenRef.current = false
                            }
                            // If value changed, onChange should have already handled it and closed the picker
                            // But just in case, close it here too
                            else if (currentValue !== datePickerValueRef.current) {
                              datePickerOpenRef.current = false
                            }
                          }, 300)
                        }}
                        max={getTodayDateString()} // Can't select future dates
                        className="pl-8 pr-2 h-8 text-xs w-32 cursor-pointer hover:border-[var(--ring)] focus:border-[var(--ring)] focus:ring-2 focus:ring-[var(--ring)] transition-all"
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          const input = document.getElementById('attendance-date-detail') as HTMLInputElement
                          if (input) {
                            input.showPicker?.() || input.focus()
                          }
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="absolute left-2 top-1/2 transform -translate-y-1/2 p-1 hover:bg-[var(--muted)] rounded transition-colors active:scale-95 z-10"
                        aria-label="Open calendar"
                        title="Click to open calendar"
                      >
                        <CalendarIcon className="h-3 w-3 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors" />
                      </button>
                    </div>
                  </div>
                  <span>•</span>
                  <span>{selectedClass.students.length} {selectedClass.students.length === 1 ? 'student' : 'students'}</span>
                  {(() => {
                    const absentCount = selectedClass.students.filter(s => s.status === 'ABSENT').length
                    const lateCount = selectedClass.students.filter(s => s.status === 'LATE').length
                    if (absentCount > 0 || lateCount > 0) {
                      return (
                        <>
                          <span>•</span>
                          <span className="font-medium text-[var(--foreground)]">
                            {absentCount} absent, {lateCount} late
                          </span>
                        </>
                      )
                    }
                    return null
                  })()}
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => setSelectedClass(null)}
                className="w-full sm:w-auto"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Classes
              </Button>
            </div>

            {/* Attendance Status Indicator */}
            {(() => {
              const totalCount = selectedClass.students.length
              const presentCount = selectedClass.students.filter(s => s.status === 'PRESENT').length
              const absentCount = selectedClass.students.filter(s => s.status === 'ABSENT').length
              const lateCount = selectedClass.students.filter(s => s.status === 'LATE').length
              const hasChanges = absentCount > 0 || lateCount > 0
              
              return (
                <div className={`flex items-start gap-3 p-3 rounded-lg ${
                  hasChanges 
                    ? 'bg-blue-50 border border-blue-200' 
                    : 'bg-green-50 border border-green-200'
                }`}>
                  <Info className={`h-5 w-5 flex-shrink-0 mt-0.5 ${
                    hasChanges ? 'text-blue-600' : 'text-green-600'
                  }`} />
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${
                      hasChanges ? 'text-blue-900' : 'text-green-900'
                    }`}>
                      {hasChanges
                        ? `${presentCount} present, ${absentCount} absent, ${lateCount} late`
                        : `All ${totalCount} students marked as present`
                      }
                    </p>
                    <p className={`text-xs mt-1 ${
                      hasChanges ? 'text-blue-700' : 'text-green-700'
                    }`}>
                      {hasChanges
                        ? 'All students are marked as present by default. Change status for absent or late students.'
                        : 'All students are automatically marked as present. Change status for any students who are absent or late.'
                      }
                    </p>
                  </div>
                </div>
              )
            })()}

            {/* Students Table */}
            {selectedClass.students.length === 0 ? (
              <div className="text-center py-12">
                <UsersIcon className="h-12 w-12 text-[var(--muted-foreground)] mx-auto mb-3 opacity-50" />
                <p className="text-sm text-[var(--muted-foreground)]">No students enrolled in this class.</p>
              </div>
            ) : (
              <Card>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student Name</TableHead>
                        <TableHead className="hidden md:table-cell">Time</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...selectedClass.students]
                        .sort((a, b) => {
                          // Sort by first name, then last name
                          const aParts = a.name.split(' ')
                          const bParts = b.name.split(' ')
                          const aFirstName = aParts[0] || ''
                          const bFirstName = bParts[0] || ''
                          const aLastName = aParts.length > 1 ? aParts[aParts.length - 1] : ''
                          const bLastName = bParts.length > 1 ? bParts[bParts.length - 1] : ''
                          
                          const firstNameCompare = aFirstName.localeCompare(bFirstName, undefined, { sensitivity: 'base' })
                          if (firstNameCompare !== 0) return firstNameCompare
                          return aLastName.localeCompare(bLastName, undefined, { sensitivity: 'base' })
                        })
                        .map((student) => (
                        <TableRow key={student.id} className="hover:bg-[var(--muted)]/50">
                          <TableCell>
                            <div>
                              <p className="font-medium text-[var(--foreground)]">{student.name}</p>
                              {student.time && (
                                <p className="text-xs text-[var(--muted-foreground)] md:hidden mt-1">
                                  {student.time}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-[var(--muted-foreground)]">
                            {student.time || '-'}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-start gap-2 sm:gap-2.5">
                              <Button
                                size="sm"
                                variant={student.status === 'PRESENT' ? 'default' : 'outline'}
                                onClick={() => handleStudentStatusChange(student.id, 'PRESENT')}
                                className={`h-10 w-10 sm:h-9 sm:w-auto sm:px-3 ${
                                  student.status === 'PRESENT'
                                    ? 'bg-green-600 hover:bg-green-700 text-white border-0'
                                    : 'border-green-300 text-green-700 hover:bg-green-50 hover:border-green-400'
                                }`}
                                title="Mark as Present"
                              >
                                <CheckCircle className="h-5 w-5 sm:h-4 sm:w-4 sm:mr-1.5" />
                                <span className="hidden sm:inline">Present</span>
                              </Button>
                              <Button
                                size="sm"
                                variant={student.status === 'ABSENT' ? 'default' : 'outline'}
                                onClick={() => handleStudentStatusChange(student.id, 'ABSENT')}
                                className={`h-10 w-10 sm:h-9 sm:w-auto sm:px-3 ${
                                  student.status === 'ABSENT'
                                    ? 'bg-red-600 hover:bg-red-700 text-white border-0'
                                    : 'border-red-300 text-red-700 hover:bg-red-50 hover:border-red-400'
                                }`}
                                title="Mark as Absent"
                              >
                                <XCircle className="h-5 w-5 sm:h-4 sm:w-4 sm:mr-1.5" />
                                <span className="hidden sm:inline">Absent</span>
                              </Button>
                              <Button
                                size="sm"
                                variant={student.status === 'LATE' ? 'default' : 'outline'}
                                onClick={() => handleStudentStatusChange(student.id, 'LATE')}
                                className={`h-10 w-10 sm:h-9 sm:w-auto sm:px-3 ${
                                  student.status === 'LATE'
                                    ? 'bg-yellow-600 hover:bg-yellow-700 text-white border-0'
                                    : 'border-yellow-300 text-yellow-700 hover:bg-yellow-50 hover:border-yellow-400'
                                }`}
                                title="Mark as Late"
                              >
                                <Clock className="h-5 w-5 sm:h-4 sm:w-4 sm:mr-1.5" />
                                <span className="hidden sm:inline">Late</span>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            )}

            {/* Footer Actions */}
            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-[var(--border)]">
              <Button
                variant="outline"
                onClick={() => {
                  setIsOpen(false)
                  setSelectedClass(null)
                }}
                className="w-full sm:w-auto"
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveAttendance}
                className="w-full sm:w-auto"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    {selectedClass.students.some(s => s.status === 'ABSENT' || s.status === 'LATE') ? 'Updating...' : 'Saving...'}
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Save Attendance
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}
