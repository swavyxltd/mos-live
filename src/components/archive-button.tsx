'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Archive, ArchiveRestore, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface ArchiveButtonProps {
  id: string
  type: 'student' | 'teacher' | 'class'
  isArchived: boolean
  onArchiveChange: (id: string, isArchived: boolean) => void
  className?: string
}

export function ArchiveButton({ 
  id, 
  type, 
  isArchived, 
  onArchiveChange, 
  className 
}: ArchiveButtonProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleArchive = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/${type}s/${id}/archive`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: isArchived ? 'unarchive' : 'archive'
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update archive status')
      }

      const data = await response.json()
      
      onArchiveChange(id, !isArchived)
      toast.success(data.message)
    } catch (error) {
      console.error('Archive error:', error)
      toast.error(`Failed to ${isArchived ? 'unarchive' : 'archive'} ${type}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      variant={isArchived ? "outline" : "destructive"}
      size="sm"
      onClick={handleArchive}
      disabled={isLoading}
      className={className}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isArchived ? (
        <>
          <ArchiveRestore className="h-4 w-4 mr-2" />
          Unarchive
        </>
      ) : (
        <>
          <Archive className="h-4 w-4 mr-2" />
          Archive
        </>
      )}
    </Button>
  )
}
