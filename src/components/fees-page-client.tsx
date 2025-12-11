'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Edit, 
  Users, 
  PoundSterling, 
  TrendingUp,
  AlertCircle,
  CheckCircle,
  User,
  GraduationCap,
  Calendar
} from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'
import Link from 'next/link'

interface ClassFee {
  id: string
  name: string
  description: string
  monthlyFee: number
  studentCount: number
  teacherName: string
  teacherId: string | null
  createdAt: string
  updatedAt: string
}

interface FeesSummary {
  totalClasses: number
  totalStudents: number
  totalMonthlyRevenue: number
  classesWithFeesSet: number
  classesWithoutFees: number
}

interface FeesPageClientProps {
  classes: ClassFee[]
  summary: FeesSummary
}

export function FeesPageClient({ classes, summary }: FeesPageClientProps) {
  const [editingClass, setEditingClass] = useState<ClassFee | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [feeAmount, setFeeAmount] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [localClasses, setLocalClasses] = useState(classes)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  
  // Generate list of years (current year and past 5 years)
  const currentYear = new Date().getFullYear()
  const availableYears = Array.from({ length: 6 }, (_, i) => currentYear - i)

  const handleEditFee = (classItem: ClassFee) => {
    setEditingClass(classItem)
    setFeeAmount(classItem.monthlyFee.toString())
    setIsEditModalOpen(true)
  }

  const handleSaveFee = async () => {
    if (!editingClass) return

    const newFee = parseFloat(feeAmount)
    if (isNaN(newFee) || newFee < 0) {
      toast.error('Please enter a valid fee amount')
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch(`/api/classes/${editingClass.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monthlyFeeP: newFee })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update fee')
      }

      // Update local state
      setLocalClasses(localClasses.map(cls => 
        cls.id === editingClass.id 
          ? { ...cls, monthlyFee: newFee }
          : cls
      ))

      toast.success('Fee updated successfully')
      setIsEditModalOpen(false)
      setEditingClass(null)
      
      // Refresh page to update summary
      window.location.reload()
    } catch (error: any) {
      toast.error(error.message || 'Failed to update fee')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancelEdit = () => {
    setIsEditModalOpen(false)
    setEditingClass(null)
    setFeeAmount('')
  }

  // Calculate monthly revenue per class
  const getMonthlyRevenue = (classItem: ClassFee) => {
    return classItem.monthlyFee * classItem.studentCount
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Fees Overview</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage fees for all classes in your madrasah. Fees are set when creating classes.
        </p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-500" />
          <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map(year => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Classes</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalClasses}</div>
            <p className="text-sm text-muted-foreground">
              {summary.classesWithFeesSet} with fees set
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalStudents}</div>
            <p className="text-sm text-muted-foreground">
              Across all classes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <PoundSterling className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(Math.round(summary.totalMonthlyRevenue * 100))}
            </div>
            <p className="text-sm text-muted-foreground">
              Potential monthly income
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Classes Needing Fees</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.classesWithoutFees}</div>
            <p className="text-sm text-muted-foreground">
              {summary.classesWithoutFees === 0 ? 'All set!' : 'Need fee configuration'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Classes Fees Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Class Fees</CardTitle>
              <p className="text-sm text-gray-500 mt-1">
                Manage monthly fees for each class. Click edit to update fees.
              </p>
            </div>
            <Link href="/classes/new">
              <Button variant="outline" size="sm">
                <GraduationCap className="h-4 w-4 mr-2" />
                Create Class
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {localClasses.length === 0 ? (
            <div className="text-center py-12">
              <GraduationCap className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No classes yet</h3>
              <p className="text-sm text-gray-500 mb-4">
                Create your first class to start managing fees.
              </p>
              <Link href="/classes/new">
                <Button>
                  <GraduationCap className="h-4 w-4 mr-2" />
                  Create Class
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Class Name</TableHead>
                    <TableHead>Teacher</TableHead>
                    <TableHead className="text-right">Students</TableHead>
                    <TableHead className="text-right">Monthly Fee</TableHead>
                    <TableHead className="text-right">Monthly Revenue</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {localClasses.map((classItem) => {
                    const monthlyRevenue = getMonthlyRevenue(classItem)
                    const hasFee = classItem.monthlyFee > 0
                    
                    return (
                      <TableRow key={classItem.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium text-gray-900">{classItem.name}</div>
                            {classItem.description && (
                              <div className="text-sm text-gray-500">{classItem.description}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-400" />
                            <span className="text-sm">{classItem.teacherName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Users className="h-4 w-4 text-gray-400" />
                            <span className="font-medium">{classItem.studentCount}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {hasFee ? (
                            <span className="font-medium">
                              {formatCurrency(Math.round(classItem.monthlyFee * 100))}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-sm">Not set</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {hasFee && classItem.studentCount > 0 ? (
                            <span className="font-medium text-green-600">
                              {formatCurrency(Math.round(monthlyRevenue * 100))}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {hasFee ? (
                            <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              No Fee
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditFee(classItem)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit Fee
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Fee Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={handleCancelEdit}
        title={`Edit Fee - ${editingClass?.name || ''}`}
      >
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              <strong>Note:</strong> Changing the fee will affect future invoices. Existing payment records will not be changed.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="feeAmount">Monthly Fee (£) *</Label>
            <Input
              id="feeAmount"
              type="number"
              min="0"
              step="0.01"
              value={feeAmount}
              onChange={(e) => setFeeAmount(e.target.value)}
              placeholder="e.g., 25.00"
            />
            <p className="text-sm text-gray-500">
              Current students: <strong>{editingClass?.studentCount || 0}</strong>
              {editingClass && editingClass.studentCount > 0 && (
                <span className="ml-2">
                  • Monthly revenue: <strong>{formatCurrency(Math.round(parseFloat(feeAmount || '0') * editingClass.studentCount * 100))}</strong>
                </span>
              )}
            </p>
          </div>

          {editingClass && editingClass.studentCount > 0 && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Impact on current students:</span>
                <span className="text-sm font-medium">
                  {editingClass.studentCount} students × {formatCurrency(Math.round(parseFloat(feeAmount || '0') * 100))} = {formatCurrency(Math.round(parseFloat(feeAmount || '0') * editingClass.studentCount * 100))}/month
                </span>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={handleCancelEdit}>
              Cancel
            </Button>
            <Button onClick={handleSaveFee} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Fee'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
