'use client'

import React from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  className?: string
}

export function Modal({ isOpen, onClose, title, children, className }: ModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-white/20 backdrop-blur-md"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className={cn(
        "relative bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-xl w-[50vw] max-h-[90vh] flex flex-col",
        className
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--border)] flex-shrink-0">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-[var(--accent)] transition-colors"
          >
            <X className="h-4 w-4 text-[var(--muted-foreground)]" />
          </button>
        </div>
        
        {/* Content - Scrollable */}
        <div className="p-6 overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </div>
  )
}
