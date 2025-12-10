'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle, Clock, User, Calendar, Download, Loader2 } from 'lucide-react'
import { useState, useEffect } from 'react'

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
  const [currentDate] = useState(new Date().toLocaleDateString())
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
      // Fetch all classes and class details in parallel
      const [classesResponse, ...classDetailPromises] = await Promise.all([
        fetch('/api/classes'),
        // We'll fetch class details after getting the list
      ])
      
      if (!classesResponse.ok) {
        throw new Error('Failed to fetch classes')
      }
      const classesData = await classesResponse.json()

      // Fetch all class details and attendance in parallel
      const classesWithStudents = await Promise.all(
        classesData.map(async (cls: any) => {
          // Fetch class details with students and attendance in parallel
          const [classResponse, attendanceResponse] = await Promise.all([
            fetch(`/api/classes/${cls.id}`),
            fetch(`/api/attendance/class/${cls.id}?date=${todayDate}`)
          ])

          if (!classResponse.ok) {
            return null
          }
          const classData = await classResponse.json()

          // Get students enrolled in this class
          const students = (classData.StudentClass || [])
            .filter((sc: any) => {
              const student = sc.Student || sc.student
              return student && !student.isArchived
            })
            .map((sc: any) => {
              const student = sc.Student || sc.student
              return {
                id: student.id || sc.studentId,
                firstName: student.firstName,
                lastName: student.lastName
              }
            })

          // Get today's attendance
          let todayAttendance: any[] = []
          if (attendanceResponse.ok) {
            try {
              const attData = await attendanceResponse.json()
              todayAttendance = attData.records || []
            } catch (e) {
              // Skip if parsing fails
            }
          }

          // Map students with their attendance status
          const studentsWithStatus: Student[] = students.map((student: any) => {
            const attendance = todayAttendance.find(
              (a: any) => a.studentId === student.id
            )
            return {
              id: student.id,
              name: `${student.firstName} ${student.lastName}`,
              status: attendance
                ? (attendance.status as 'PRESENT' | 'ABSENT' | 'LATE')
                : 'UNMARKED',
              time: attendance?.createdAt
                ? new Date(attendance.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })
                : undefined
            }
          })

          return {
            id: cls.id,
            name: cls.name,
            teacher: classData.User?.name || 'Unassigned',
            students: studentsWithStatus
          }
        })
      )

      // Filter out null values and classes with no students
      const validClasses = classesWithStudents.filter(
        (cls): cls is Class => cls !== null && cls.students.length > 0
      )

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
        return <CheckCircle className="h-6 w-6 text-green-600" />
      case 'ABSENT':
        return <XCircle className="h-6 w-6 text-red-600" />
      case 'LATE':
        return <Clock className="h-6 w-6 text-yellow-600" />
      default:
        return <User className="h-6 w-6 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PRESENT':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'ABSENT':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'LATE':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
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
      {isOpen && (
        <div className="fixed inset-0 bg-white/20 backdrop-blur-md flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-[var(--card)] rounded-lg shadow-xl border border-[var(--border)] w-[95vw] sm:w-[90vw] md:w-[75vw] max-h-[95vh] overflow-y-auto">
            <div className="p-3 sm:p-6">
              <div className="flex justify-between items-center mb-4 sm:mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-[var(--foreground)]">Mark Attendance</h2>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsOpen(false)
                    setSelectedClass(null)
                  }}
                  className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] p-2"
                >
                  ✕
                </Button>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-[var(--muted-foreground)]" />
                  <span className="ml-3 text-[var(--muted-foreground)]">Loading classes...</span>
                </div>
              ) : !selectedClass ? (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">Select Class</h3>
                  {classes.length === 0 ? (
                    <div className="text-center py-8 text-[var(--muted-foreground)]">
                      <p>No classes with students found.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3 sm:gap-4">
                      {classes.map((classItem) => (
                        <Card 
                          key={classItem.id} 
                          className="cursor-pointer hover:shadow-md transition-shadow p-4 sm:p-6"
                          onClick={() => handleClassSelect(classItem)}
                        >
                          <div className="space-y-2">
                            <h4 className="text-lg font-semibold text-[var(--foreground)]">{classItem.name}</h4>
                            <p className="text-sm text-[var(--muted-foreground)]">Teacher: {classItem.teacher}</p>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-[var(--muted-foreground)]">
                                {classItem.students.length} students
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {classItem.students.filter(s => s.status !== 'UNMARKED').length} marked
                              </Badge>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4 sm:space-y-6">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-[var(--foreground)]">{selectedClass.name}</h3>
                      <p className="text-sm text-[var(--muted-foreground)]">Teacher: {selectedClass.teacher} • Date: {currentDate}</p>
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={() => setSelectedClass(null)}
                      className="text-sm w-full sm:w-auto"
                    >
                      ← Back to Classes
                    </Button>
                  </div>

                  <div>
                    {selectedClass.students.length === 0 ? (
                      <div className="text-center py-8 text-[var(--muted-foreground)]">
                        <p>No students enrolled in this class.</p>
                      </div>
                    ) : (
                      selectedClass.students.map((student, index) => (
                        <div key={student.id}>
                          <div className="flex items-center justify-between p-4 bg-[var(--muted)] hover:bg-[var(--accent)] transition-colors">
                            <div className="flex items-center space-x-3 flex-1 min-w-0">
                              {getStatusIcon(student.status)}
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-[var(--foreground)] truncate">{student.name}</p>
                                {student.time && (
                                  <p className="text-sm text-[var(--muted-foreground)]">Time: {student.time}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center space-x-2 ml-3">
                              <Button
                                size="lg"
                                variant={student.status === 'PRESENT' ? 'default' : 'outline'}
                                onClick={() => handleStudentStatusChange(student.id, 'PRESENT')}
                                className={`h-12 w-12 p-0 ${
                                  student.status === 'PRESENT' 
                                    ? 'bg-green-600 hover:bg-green-700 text-white border-green-600' 
                                    : 'border-green-300 text-green-700 hover:bg-green-50'
                                }`}
                              >
                                <CheckCircle className="h-6 w-6" />
                              </Button>
                              <Button
                                size="lg"
                                variant={student.status === 'ABSENT' ? 'default' : 'outline'}
                                onClick={() => handleStudentStatusChange(student.id, 'ABSENT')}
                                className={`h-12 w-12 p-0 ${
                                  student.status === 'ABSENT' 
                                    ? 'bg-red-600 hover:bg-red-700 text-white border-red-600' 
                                    : 'border-red-300 text-red-700 hover:bg-red-50'
                                }`}
                              >
                                <XCircle className="h-6 w-6" />
                              </Button>
                              <Button
                                size="lg"
                                variant={student.status === 'LATE' ? 'default' : 'outline'}
                                onClick={() => handleStudentStatusChange(student.id, 'LATE')}
                                className={`h-12 w-12 p-0 ${
                                  student.status === 'LATE' 
                                    ? 'bg-yellow-600 hover:bg-yellow-700 text-white border-yellow-600' 
                                    : 'border-yellow-300 text-yellow-700 hover:bg-yellow-50'
                                }`}
                              >
                                <Clock className="h-6 w-6" />
                              </Button>
                            </div>
                          </div>
                          {index < selectedClass.students.length - 1 && (
                            <div className="border-b border-[var(--border)]" />
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
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
                      className="bg-green-600 hover:bg-green-700 w-full sm:w-auto"
                      disabled={saving}
                    >
                      {saving ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Saving...
                        </>
                      ) : (
                        'Save Attendance'
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
