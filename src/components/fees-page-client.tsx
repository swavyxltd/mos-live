'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { Plus, Edit, Trash2, Eye } from 'lucide-react'

interface Fee {
  id: string
  name: string
  description: string
  amount: number
  currency: string
  billingCycle: string
  isActive: boolean
  studentCount: number
  createdAt: Date
  updatedAt: Date
}

interface FeesPageClientProps {
  initialFees: Fee[]
}

export function FeesPageClient({ initialFees }: FeesPageClientProps) {
  const [fees, setFees] = useState<Fee[]>([])
  const [selectedFee, setSelectedFee] = useState<Fee | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [editingFee, setEditingFee] = useState<Fee | null>(null)
  const [deletingFee, setDeletingFee] = useState<Fee | null>(null)
  const [deleteStep, setDeleteStep] = useState(1) // 1 = first confirmation, 2 = second confirmation

  // Ensure proper hydration by setting initial fees after mount
  useEffect(() => {
    setFees(initialFees)
  }, [initialFees])

  // Show loading state during hydration
  if (fees.length === 0 && initialFees.length > 0) {
    return <div>Loading...</div>
  }

  const handleEditFee = (fee: Fee) => {
    setEditingFee(fee)
    setIsEditModalOpen(true)
  }

  const handleViewFee = (fee: Fee) => {
    setSelectedFee(fee)
    setIsViewModalOpen(true)
  }

  const handleDeleteFee = (fee: Fee) => {
    setDeletingFee(fee)
    setDeleteStep(1)
    setIsDeleteModalOpen(true)
  }

  const handleConfirmDelete = () => {
    if (deleteStep === 1) {
      setDeleteStep(2)
    } else {
      // Actually delete the fee
      if (deletingFee) {
        setFees(fees.filter(fee => fee.id !== deletingFee.id))
        console.log(`Deleted fee: ${deletingFee.name}`)
        // TODO: Implement actual delete API call
      }
      setIsDeleteModalOpen(false)
      setDeletingFee(null)
      setDeleteStep(1)
    }
  }

  const handleCancelDelete = () => {
    setIsDeleteModalOpen(false)
    setDeletingFee(null)
    setDeleteStep(1)
  }

  const handleSaveFee = (updatedFee: Fee) => {
    if (fees.find(fee => fee.id === updatedFee.id)) {
      // Update existing fee
      setFees(fees.map(fee => fee.id === updatedFee.id ? updatedFee : fee))
      console.log('Updated fee:', updatedFee)
    } else {
      // Add new fee
      setFees([...fees, updatedFee])
      console.log('Added new fee:', updatedFee)
    }
    setIsEditModalOpen(false)
    setEditingFee(null)
    // TODO: Implement actual API call
  }

  const handleCancelEdit = () => {
    setIsEditModalOpen(false)
    setEditingFee(null)
  }

  const handleCloseView = () => {
    setIsViewModalOpen(false)
    setSelectedFee(null)
  }

  const handleAddFee = () => {
    const newFee: Fee = {
      id: `demo-fees-${Date.now()}`,
      name: 'New Fee Plan',
      description: 'Enter description here',
      amount: 0.00,
      currency: 'GBP',
      billingCycle: 'MONTHLY',
      isActive: true,
      studentCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    }
    setEditingFee(newFee)
    setIsEditModalOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fees Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage fee plans and pricing for your organization.
          </p>
        </div>
        <Button onClick={handleAddFee} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Add Fee Plan
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Fee Plans</h2>
            <div className="text-sm text-gray-500">
              {fees.length} fee plan{fees.length !== 1 ? 's' : ''}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {fees.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Plus className="h-6 w-6 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No fee plans yet</h3>
              <p className="text-gray-500 mb-4">Get started by adding your first fee plan.</p>
              <Button onClick={handleAddFee}>Add Fee Plan</Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fee Plan</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Students</TableHead>
                    <TableHead>Monthly Total</TableHead>
                    <TableHead>Billing Cycle</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                {fees.map((fee) => (
                  <TableRow key={fee.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium text-gray-900">{fee.name}</div>
                        <div className="text-sm text-gray-500">{fee.description}</div>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {fee.currency === 'GBP' ? '£' : fee.currency} {fee.amount.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{fee.studentCount}</div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {fee.currency === 'GBP' ? '£' : fee.currency} {(fee.amount * fee.studentCount).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {fee.billingCycle.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                    </TableCell>
                    <TableCell>
                      <Badge variant={fee.isActive ? 'default' : 'secondary'}>
                        {fee.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end space-x-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleViewFee(fee)}
                          title="View fee details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleEditFee(fee)}
                          title="Edit fee"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleDeleteFee(fee)}
                          title="Delete fee"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Fee Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={handleCloseView}
        title="Fee Plan Details"
      >
        {selectedFee && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Name</label>
                <p className="text-sm text-gray-900">{selectedFee.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Amount</label>
                <p className="text-sm text-gray-900">{selectedFee.currency === 'GBP' ? '£' : selectedFee.currency} {selectedFee.amount.toFixed(2)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Students Paying</label>
                <p className="text-sm text-gray-900">{selectedFee.studentCount} students</p>
                <p className="text-xs text-gray-500">Auto-calculated from enrollments</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Monthly Total</label>
                <p className="text-sm text-gray-900 font-medium">{selectedFee.currency === 'GBP' ? '£' : selectedFee.currency} {(selectedFee.amount * selectedFee.studentCount).toFixed(2)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Billing Cycle</label>
                <p className="text-sm text-gray-900">{selectedFee.billingCycle.replace('_', ' ')}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Status</label>
                <Badge variant={selectedFee.isActive ? 'default' : 'secondary'}>
                  {selectedFee.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Description</label>
              <p className="text-sm text-gray-900">{selectedFee.description}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Created</label>
                <p className="text-sm text-gray-900">
                  {selectedFee.createdAt.toLocaleDateString()}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Last Updated</label>
                <p className="text-sm text-gray-900">
                  {selectedFee.updatedAt.toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2 pt-4">
              <Button variant="outline" onClick={handleCloseView} className="w-full sm:w-auto">
                Close
              </Button>
              <Button onClick={() => {
                handleCloseView()
                handleEditFee(selectedFee)
              }} className="w-full sm:w-auto">
                Edit Fee
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Fee Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={handleCancelEdit}
        title="Edit Fee Plan"
      >
        {editingFee && (
          <EditFeeForm
            fee={editingFee}
            onSave={handleSaveFee}
            onCancel={handleCancelEdit}
          />
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={handleCancelDelete}
        title={deleteStep === 1 ? "Confirm Deletion" : "Final Confirmation"}
      >
        {deletingFee && (
          <div className="space-y-4">
            {deleteStep === 1 ? (
              <>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Trash2 className="h-5 w-5 text-red-400" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">
                        Are you sure you want to delete this fee plan?
                      </h3>
                      <div className="mt-2 text-sm text-red-700">
                        <p><strong>Fee Plan:</strong> {deletingFee.name}</p>
                        <p><strong>Amount:</strong> {deletingFee.currency === 'GBP' ? '£' : deletingFee.currency} {deletingFee.amount.toFixed(2)}</p>
                        <p><strong>Students:</strong> {deletingFee.studentCount}</p>
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-600">
                  This action will permanently delete the fee plan and cannot be undone.
                </p>
              </>
            ) : (
              <>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Trash2 className="h-5 w-5 text-red-400" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">
                        Final Confirmation Required
                      </h3>
                      <div className="mt-2 text-sm text-red-700">
                        <p>You are about to permanently delete:</p>
                        <p><strong>"{deletingFee.name}"</strong></p>
                        <p className="mt-2 font-medium">This action cannot be undone!</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm text-yellow-800">
                    <strong>Warning:</strong> This will remove the fee plan from all student records and billing systems.
                  </p>
                </div>
              </>
            )}
            
            <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2 pt-4">
              <Button 
                variant="outline" 
                onClick={handleCancelDelete}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button 
                variant="destructive"
                onClick={handleConfirmDelete}
                className="w-full sm:w-auto"
              >
                {deleteStep === 1 ? 'Yes, Delete Fee Plan' : 'Permanently Delete'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

interface EditFeeFormProps {
  fee: Fee
  onSave: (fee: Fee) => void
  onCancel: () => void
}

function EditFeeForm({ fee, onSave, onCancel }: EditFeeFormProps) {
  const [formData, setFormData] = useState({
    name: fee.name,
    description: fee.description,
    amount: fee.amount,
    currency: fee.currency,
    billingCycle: fee.billingCycle,
    isActive: fee.isActive
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const updatedFee: Fee = {
      ...fee,
      ...formData,
      updatedAt: new Date()
    }
    onSave(updatedFee)
  }

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Fee Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Amount *
          </label>
          <div className="flex">
            <select
              value={formData.currency}
              onChange={(e) => handleChange('currency', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="GBP">£</option>
              <option value="USD">$</option>
              <option value="EUR">€</option>
            </select>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.amount}
              onChange={(e) => handleChange('amount', parseFloat(e.target.value) || 0)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-r-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Billing Cycle *
          </label>
          <select
            value={formData.billingCycle}
            onChange={(e) => handleChange('billingCycle', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="MONTHLY">Monthly</option>
            <option value="QUARTERLY">Quarterly</option>
            <option value="YEARLY">Yearly</option>
            <option value="ONE_TIME">One Time</option>
            <option value="TERMLY">Termly</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            value={formData.isActive ? 'active' : 'inactive'}
            onChange={(e) => handleChange('isActive', e.target.value === 'active')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Students Paying (Auto-calculated)
          </label>
          <div className="flex">
            <div className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700">
              {fee.studentCount} students
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {fee.studentCount === 0 ? 'Will be calculated when students enroll' : 'Based on current student enrollments'}
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Monthly Total (Calculated)
          </label>
          <div className="flex">
            <span className="inline-flex items-center px-3 py-2 border border-gray-300 border-r-0 rounded-l-md bg-gray-50 text-gray-500 text-sm">
              {formData.currency === 'GBP' ? '£' : formData.currency}
            </span>
            <div className="flex-1 px-3 py-2 border border-gray-300 rounded-r-md bg-gray-50 text-gray-700">
              {(formData.amount * fee.studentCount).toFixed(2)}
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Automatically calculated: {formData.amount} × {fee.studentCount} students
          </p>
        </div>
      </div>


      <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} className="w-full sm:w-auto">
          Cancel
        </Button>
        <Button type="submit" className="w-full sm:w-auto">
          Save Changes
        </Button>
      </div>
    </form>
  )
}
