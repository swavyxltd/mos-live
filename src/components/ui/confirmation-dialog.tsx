'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle, CheckCircle, Info, X, XCircle } from 'lucide-react'

interface ConfirmationDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'default' | 'destructive' | 'warning' | 'info'
  isLoading?: boolean
}

export function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  isLoading = false
}: ConfirmationDialogProps) {
  useEffect(() => {
    if (isOpen) {
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  const getIcon = () => {
    switch (variant) {
      case 'destructive':
        return <XCircle className="h-5 w-5 text-red-600" />
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />
      case 'info':
        return <Info className="h-5 w-5 text-blue-600" />
      default:
        return <CheckCircle className="h-5 w-5 text-green-600" />
    }
  }

  const getConfirmButtonVariant = () => {
    switch (variant) {
      case 'destructive':
        return 'destructive'
      case 'warning':
        return 'default'
      default:
        return 'default'
    }
  }

  const getIconBgColor = () => {
    switch (variant) {
      case 'destructive':
        return 'bg-red-50'
      case 'warning':
        return 'bg-yellow-50'
      case 'info':
        return 'bg-blue-50'
      default:
        return 'bg-green-50'
    }
  }

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
          className="w-full max-w-lg my-8 pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-md overflow-hidden">
          {/* Header */}
          <div className="p-4 sm:p-6 border-b border-[var(--border)]">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 ${getIconBgColor()} rounded-lg flex items-center justify-center flex-shrink-0`}>
                    {getIcon()}
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
              >
                <X className="h-4 w-4 text-[var(--muted-foreground)]" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row gap-3 justify-end">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
                className="w-full sm:w-auto"
              >
                {cancelText}
              </Button>
              <Button
                variant={getConfirmButtonVariant()}
                onClick={onConfirm}
                disabled={isLoading}
                className="w-full sm:w-auto"
              >
                {isLoading ? 'Processing...' : confirmText}
              </Button>
            </div>
          </div>
          </div>
        </div>
      </div>
    </>
  )
}
