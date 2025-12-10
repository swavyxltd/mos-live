'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { CheckCircle, XCircle, Clock, User, Calendar, Download, Loader2, ArrowLeft, Users as UsersIcon } from 'lucide-react'
import { useState, useEffect } from 'react'
import { formatDate } from '@/lib/utils'

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

export function AttendanceMarking() {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedClass, setSelectedClass] = useState<Class | null>(null)
  const [classes, setClasses] = useState<Class[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [currentDate] = useState(formatDate(new Date()))
  const [todayDate] = useState(new Date().toISOString().split('T')[0])

  // Fetch classes and students when modal opens
  useEffect(() => {
    if (isOpen && classes.length === 0) {
      fetchClasses()
    }
  }, [isOpen])

  const fetchClasses = async () => {
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
            const classAttendanceResponse = await fetch(
              `/api/attendance/class/${cls.id}?date=${todayDate}`
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
                      return {
                        id: student.id,
                        name: `${student.firstName} ${student.lastName}`,
                        status: 'UNMARKED' as const,
                        time: undefined
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
            const studentsWithStatus: Student[] = (classAttendanceData.students || []).map((student: any) => ({
              id: student.id,
              name: student.name,
              status: student.status || 'UNMARKED',
              time: student.time
            }))

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

      setClasses(validClasses)
    } catch (error) {
      console.error('Error fetching classes:', error)
    } finally {
      setLoading(false)
    }
  }

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
              return {
                ...student,
                status,
                time: status !== 'ABSENT' ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined
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
      const attendanceRecords = selectedClass.students
        .filter(student => student.status !== 'UNMARKED')
        .map(student => ({
          studentId: student.id,
          status: student.status
        }))

      if (attendanceRecords.length === 0) {
        alert('Please mark at least one student before saving.')
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
          date: todayDate,
          attendance: attendanceRecords
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save attendance')
      }

      // Refresh classes to get updated attendance
      await fetchClasses()
      
      setIsOpen(false)
      setSelectedClass(null)
      
      // Show success message
      alert('Attendance saved successfully!')
    } catch (error: any) {
      console.error('Error saving attendance:', error)
      alert(error.message || 'Failed to save attendance. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleExportCSV = () => {
    // Generate CSV content
    const csvContent = classes.map(cls => {
      const header = `Class: ${cls.name}, Teacher: ${cls.teacher}, Date: ${currentDate}\n`
      const studentRows = cls.students.map(student => 
        `${student.name},${student.status},${student.time || '-'}`
      ).join('\n')
      return header + 'Student,Status,Time\n' + studentRows
    }).join('\n\n')

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `attendance-${currentDate.replace(/\//g, '-')}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
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
      <div className="flex space-x-3">
        <Button onClick={handleMarkAttendance} className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Mark Attendance
        </Button>
        <Button onClick={handleExportCSV} variant="outline" className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Attendance Marking Modal */}
      <Modal
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false)
          setSelectedClass(null)
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
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-[var(--muted-foreground)]">Select a class to mark attendance for {currentDate}</p>
            </div>
            {classes.length === 0 ? (
              <div className="text-center py-12">
                <UsersIcon className="h-12 w-12 text-[var(--muted-foreground)] mx-auto mb-3 opacity-50" />
                <p className="text-sm text-[var(--muted-foreground)]">No classes with students found.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {classes.map((classItem) => {
                  const markedCount = classItem.students.filter(s => s.status !== 'UNMARKED').length
                  const totalCount = classItem.students.length
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
                  <span>Date: {currentDate}</span>
                  <span>•</span>
                  <span>{selectedClass.students.length} {selectedClass.students.length === 1 ? 'student' : 'students'}</span>
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
                      {selectedClass.students.map((student) => (
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
                    Saving...
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
