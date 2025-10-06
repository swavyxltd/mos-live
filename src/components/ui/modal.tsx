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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className={cn(
        "relative bg-[var(--card)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] w-full max-w-md mx-4",
        className
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--border)]">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-[var(--radius-md)] hover:bg-[var(--muted)] transition-colors"
          >
            <X className="h-4 w-4 text-[var(--muted-foreground)]" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  )
}
