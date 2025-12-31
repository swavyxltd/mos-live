'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AlertTriangle, X } from 'lucide-react'

interface DeleteConfirmationDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  isLoading?: boolean
  itemName?: string
}

export function DeleteConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  isLoading = false,
  itemName
}: DeleteConfirmationDialogProps) {
  const [confirmTextInput, setConfirmTextInput] = useState('')
  const requiredText = 'delete'

  useEffect(() => {
    if (isOpen) {
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden'
      // Reset confirmation text when modal opens
      setConfirmTextInput('')
    } else {
      document.body.style.overflow = ''
    }
    
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  const isConfirmEnabled = confirmTextInput.toLowerCase() === requiredText

  const handleConfirm = () => {
    if (isConfirmEnabled && !isLoading) {
      onConfirm()
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop - covers entire screen */}
      <div 
        className="fixed bg-white/20 backdrop-blur-md z-50"
        style={{ 
          width: '100vw', 
          height: '100vh',
          minHeight: '100vh',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          position: 'fixed'
        }}
        onClick={onClose}
      />
      {/* Modal Content */}
      <div 
        className="fixed inset-0 flex items-center justify-center z-[51] p-4 overflow-y-auto pointer-events-none"
      >
        <div 
          className="w-[95vw] sm:w-[90vw] md:w-[75vw] lg:w-[600px] my-8 pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-md overflow-hidden">
            {/* Header */}
            <div className="p-4 sm:p-6 border-b border-[var(--border)]">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                    </div>
                    <h2 className="text-lg sm:text-xl font-semibold text-[var(--foreground)]">
                      {title}
                    </h2>
                  </div>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    {message}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-1 rounded-md hover:bg-[var(--accent)] transition-colors flex-shrink-0"
                  disabled={isLoading}
                >
                  <X className="h-4 w-4 text-[var(--muted-foreground)]" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-6 space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800 font-medium mb-2">
                  ⚠️ This action cannot be undone
                </p>
                <p className="text-sm text-red-700">
                  This will permanently delete {itemName ? `"${itemName}"` : 'this organisation'} and all associated data including:
                </p>
                <ul className="text-sm text-red-700 mt-2 space-y-1 list-disc list-inside">
                  <li>All admin, staff, and teacher accounts</li>
                  <li>All student and parent accounts</li>
                  <li>All classes and attendance records</li>
                  <li>All invoices and payment records</li>
                  <li>All messages and announcements</li>
                  <li>All other associated data</li>
                </ul>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--foreground)]">
                  Type <span className="font-mono bg-[var(--accent)] px-1.5 py-0.5 rounded">delete</span> to confirm:
                </label>
                <Input
                  type="text"
                  value={confirmTextInput}
                  onChange={(e) => setConfirmTextInput(e.target.value)}
                  placeholder="Type 'delete' to confirm"
                  disabled={isLoading}
                  className="font-mono"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && isConfirmEnabled) {
                      handleConfirm()
                    }
                  }}
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-end pt-4">
                <Button
                  variant="outline"
                  onClick={onClose}
                  disabled={isLoading}
                  className="w-full sm:w-auto"
                >
                  {cancelText}
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleConfirm}
                  disabled={!isConfirmEnabled || isLoading}
                  className="w-full sm:w-auto"
                >
                  {isLoading ? 'Deleting...' : confirmText}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

