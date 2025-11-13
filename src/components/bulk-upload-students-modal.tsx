'use client'

import { useState, useRef } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Upload, 
  Download, 
  FileText, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Loader2,
  Users,
  Save
} from 'lucide-react'
import { toast } from 'sonner'

interface Class {
  id: string
  name: string
}

interface StudentRow {
  rowNumber: number
  firstName: string
  lastName: string
  parentEmail: string
  parentPhone?: string
  startMonth?: string
  classId: string
  isValid: boolean
  errors: string[]
  isDuplicate?: boolean
  existingStudentId?: string
}

interface BulkUploadStudentsModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  classes: Class[]
}

export function BulkUploadStudentsModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  classes 
}: BulkUploadStudentsModalProps) {
  const [step, setStep] = useState<'menu' | 'upload' | 'review' | 'processing' | 'complete'>('menu')
  const [isUploading, setIsUploading] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [students, setStudents] = useState<StudentRow[]>([])
  const [stats, setStats] = useState({
    total: 0,
    valid: 0,
    invalid: 0,
    duplicates: 0
  })
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch('/api/students/bulk-upload/template')
      if (!response.ok) {
        throw new Error('Failed to download template')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'student-upload-template.csv'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      toast.success('Template downloaded successfully')
    } catch (error) {
      toast.error('Failed to download template')
    }
  }

  const handleFileSelect = () => {
    fileInputRef.current?.click()
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file')
      return
    }

    setIsUploading(true)
    setUploadProgress(0)
    setStep('upload')

    const formData = new FormData()
    formData.append('file', file)

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 200)

      const response = await fetch('/api/students/bulk-upload', {
        method: 'POST',
        body: formData
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to upload file')
      }

      const data = await response.json()
      
      // Initialize classId for each student (empty, needs manual selection)
      const studentsWithClasses = data.rows.map((row: StudentRow) => ({
        ...row,
        classId: '' // Empty, admin will select
      }))

      setStudents(studentsWithClasses)
      setStats({
        total: data.totalRows,
        valid: data.validRows,
        invalid: data.invalidRows,
        duplicates: data.duplicateRows
      })

      setStep('review')
      toast.success(`File uploaded! Found ${data.totalRows} students`)
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload file')
      setStep('menu')
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleClassChange = (rowNumber: number, classId: string) => {
    setStudents(prev => 
      prev.map(s => 
        s.rowNumber === rowNumber 
          ? { ...s, classId }
          : s
      )
    )
  }

  const handleFieldEdit = (rowNumber: number, field: string, value: string) => {
    setStudents(prev =>
      prev.map(s =>
        s.rowNumber === rowNumber
          ? { ...s, [field]: value }
          : s
      )
    )
  }

  const handleConfirm = async () => {
    // Validate all students have class selected
    const studentsWithoutClass = students.filter(s => !s.classId && s.isValid)
    if (studentsWithoutClass.length > 0) {
      toast.error(`Please select a class for all students. ${studentsWithoutClass.length} student(s) missing class selection.`)
      return
    }

    // Only process valid students (skip invalid ones)
    const validStudents = students.filter(s => s.isValid)

    if (validStudents.length === 0) {
      toast.error('No valid students to create')
      return
    }

    setIsProcessing(true)
    setStep('processing')

    try {
      const response = await fetch('/api/students/bulk-upload/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          students: validStudents.map(s => ({
            ...s,
            startMonth: new Date().toISOString().slice(0, 7) // Always use current month
          }))
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create students')
      }

      const data = await response.json()
      
      setStep('complete')
      toast.success(`Successfully created ${data.summary.created} students and updated ${data.summary.updated} students!`)
      
      // Refresh after 2 seconds
      setTimeout(() => {
        onSuccess()
        handleClose()
      }, 2000)
    } catch (error: any) {
      toast.error(error.message || 'Failed to create students')
      setStep('review')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleClose = () => {
    setStep('menu')
    setStudents([])
    setStats({ total: 0, valid: 0, invalid: 0, duplicates: 0 })
    setUploadProgress(0)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    onClose()
  }

  const validStudents = students.filter(s => s.isValid)
  const invalidStudents = students.filter(s => !s.isValid)
  const duplicateStudents = students.filter(s => s.isDuplicate)

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Bulk Add Students"
      className="max-w-6xl"
    >
      <div className="space-y-6">
        {/* Step 1: Menu */}
        {step === 'menu' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Upload multiple students at once using a CSV file. Download the template, fill it in, then upload it back.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="cursor-pointer hover:bg-gray-50 transition-colors" onClick={handleDownloadTemplate}>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <Download className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Download Template CSV</h3>
                      <p className="text-sm text-gray-600">Get the template file to fill in</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:bg-gray-50 transition-colors" onClick={handleFileSelect}>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-green-100 rounded-lg">
                      <Upload className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Upload CSV</h3>
                      <p className="text-sm text-gray-600">Upload your filled CSV file</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        )}

        {/* Step 2: Upload Progress */}
        {step === 'upload' && (
          <div className="space-y-4">
            <div className="text-center">
              <Loader2 className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
              <p className="text-lg font-semibold text-gray-900">Uploading and processing file...</p>
              <p className="text-sm text-gray-600 mt-2">{uploadProgress}% complete</p>
              <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Review Table */}
        {step === 'review' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Review Student Data</h3>
                <p className="text-sm text-gray-600">Select a class for each student and review the information</p>
              </div>
              <Button variant="outline" onClick={() => setStep('menu')}>
                Upload Different File
              </Button>
            </div>

            {/* Students Table */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Row</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">First Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Parent Email</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Parent Phone</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Class *</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {students.map((student) => (
                      <tr 
                        key={student.rowNumber}
                        className={`
                          ${!student.isValid ? 'bg-red-50' : ''}
                          ${student.isDuplicate ? 'bg-yellow-50' : ''}
                          ${student.isValid && !student.isDuplicate ? 'bg-white' : ''}
                        `}
                      >
                        <td className="px-4 py-3 text-sm text-gray-900">{student.rowNumber}</td>
                        <td className="px-4 py-3">
                          <Input
                            value={student.firstName}
                            onChange={(e) => handleFieldEdit(student.rowNumber, 'firstName', e.target.value)}
                            className="w-32 text-sm"
                            disabled={!student.isValid}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <Input
                            value={student.lastName}
                            onChange={(e) => handleFieldEdit(student.rowNumber, 'lastName', e.target.value)}
                            className="w-32 text-sm"
                            disabled={!student.isValid}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <Input
                            type="email"
                            value={student.parentEmail}
                            onChange={(e) => handleFieldEdit(student.rowNumber, 'parentEmail', e.target.value)}
                            className="w-48 text-sm"
                            disabled={!student.isValid}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <Input
                            value={student.parentPhone || ''}
                            onChange={(e) => handleFieldEdit(student.rowNumber, 'parentPhone', e.target.value)}
                            className="w-36 text-sm"
                            disabled={!student.isValid}
                            placeholder="Optional"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <Select
                            value={student.classId}
                            onValueChange={(value) => handleClassChange(student.rowNumber, value)}
                            disabled={!student.isValid}
                          >
                            <SelectTrigger className="w-48 text-sm">
                              <SelectValue placeholder="Select class" />
                            </SelectTrigger>
                            <SelectContent>
                              {classes.map((cls) => (
                                <SelectItem key={cls.id} value={cls.id}>
                                  {cls.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-4 py-3">
                          {!student.isValid && (
                            <div className="flex flex-col">
                              {student.errors.map((error, idx) => (
                                <span key={idx} className="text-xs text-red-600">{error}</span>
                              ))}
                            </div>
                          )}
                          {student.isDuplicate && (
                            <span className="text-xs text-yellow-600">Duplicate (will update)</span>
                          )}
                          {student.isValid && !student.isDuplicate && (
                            <span className="text-xs text-green-600">Ready</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom Stats */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-blue-600" />
                <p className="text-sm font-medium text-blue-900">
                  Adding {validStudents.length} student{validStudents.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button 
                onClick={handleConfirm}
                disabled={validStudents.length === 0 || validStudents.some(s => !s.classId)}
              >
                <Save className="h-4 w-4 mr-2" />
                Confirm & Create {validStudents.length} Student{validStudents.length !== 1 ? 's' : ''}
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Processing */}
        {step === 'processing' && (
          <div className="space-y-4 text-center py-8">
            <Loader2 className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-lg font-semibold text-gray-900">Creating students...</p>
            <p className="text-sm text-gray-600">This may take a moment</p>
          </div>
        )}

        {/* Step 5: Complete */}
        {step === 'complete' && (
          <div className="space-y-4 text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <p className="text-lg font-semibold text-gray-900">Students created successfully!</p>
            <p className="text-sm text-gray-600">Redirecting...</p>
          </div>
        )}
      </div>
    </Modal>
  )
}

