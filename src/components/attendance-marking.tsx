'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle, Clock, User, Calendar, Download } from 'lucide-react'
import { useState } from 'react'

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

const demoClasses: Class[] = [
  {
    id: 'class-1',
    name: 'Quran Recitation - Level 1',
    teacher: 'Moulana Omar',
    students: [
      { id: 's1', name: 'Ahmed Hassan', status: 'UNMARKED' },
      { id: 's2', name: 'Fatima Ali', status: 'UNMARKED' },
      { id: 's3', name: 'Yusuf Patel', status: 'UNMARKED' }
    ]
  },
  {
    id: 'class-2',
    name: 'Islamic Studies - Level 2',
    teacher: 'Apa Aisha',
    students: [
      { id: 's4', name: 'Mariam Ahmed', status: 'UNMARKED' },
      { id: 's5', name: 'Hassan Khan', status: 'UNMARKED' }
    ]
  }
]

export function AttendanceMarking() {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedClass, setSelectedClass] = useState<Class | null>(null)
  const [classes, setClasses] = useState<Class[]>(demoClasses)
  const [currentDate] = useState(new Date().toLocaleDateString())

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

  const handleSaveAttendance = () => {
    // Here you would typically save to your backend
    setIsOpen(false)
    setSelectedClass(null)
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
          <div className="bg-[var(--card)] rounded-lg shadow-xl border border-[var(--border)] w-full max-w-4xl max-h-[95vh] overflow-y-auto">
            <div className="p-3 sm:p-6">
              <div className="flex justify-between items-center mb-4 sm:mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-[var(--foreground)]">Mark Attendance</h2>
                <Button 
                  variant="outline" 
                  onClick={() => setIsOpen(false)}
                  className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] p-2"
                >
                  ✕
                </Button>
              </div>

              {!selectedClass ? (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">Select Class</h3>
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

                  <div className="space-y-3">
                    {selectedClass.students.map((student) => (
                      <div key={student.id} className="flex items-center justify-between p-4 border border-[var(--border)] rounded-lg bg-[var(--muted)] hover:bg-[var(--accent)] transition-colors shadow-sm">
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          {getStatusIcon(student.status)}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-[var(--foreground)] truncate">{student.name}</p>
                            {student.time && (
                              <p className="text-xs text-[var(--muted-foreground)]">Time: {student.time}</p>
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
                                : 'border-green-300 dark:border-green-700 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20'
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
                                : 'border-red-300 dark:border-red-700 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
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
                                : 'border-yellow-300 dark:border-yellow-700 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20'
                            }`}
                          >
                            <Clock className="h-6 w-6" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
                    <Button 
                      variant="outline" 
                      onClick={() => setIsOpen(false)}
                      className="w-full sm:w-auto"
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleSaveAttendance}
                      className="bg-green-600 hover:bg-green-700 w-full sm:w-auto"
                    >
                      Save Attendance
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
