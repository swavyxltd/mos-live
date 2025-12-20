'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Send, Copy, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Switch } from '@/components/ui/switch'

interface SendMessageModalProps {
  isOpen: boolean
  onClose: () => void
  onSend: (data: MessageData) => Promise<void>
  onMessageSent?: () => void // Callback to refresh messages list
  initialClassId?: string | null // Pre-select a class when opening
  initialParentId?: string | null // Pre-select a parent when opening
}

interface MessageData {
  title: string
  message: string
  audience: 'all' | 'class' | 'individual'
  classId?: string
  parentId?: string
}

interface Class {
  id: string
  name: string
}

interface Parent {
  id: string
  name: string | null
  email: string
}

export function SendMessageModal({ isOpen, onClose, onSend, onMessageSent, initialClassId, initialParentId }: SendMessageModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    audience: 'all' as 'all' | 'class' | 'individual',
    classId: '',
    parentId: '',
    showOnAnnouncements: true // Default to true - always show on announcements page
  })
  const [loading, setLoading] = useState(false)
  const [classes, setClasses] = useState<Class[]>([])
  const [parents, setParents] = useState<Parent[]>([])
  const [loadingClasses, setLoadingClasses] = useState(false)
  const [loadingParents, setLoadingParents] = useState(false)
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false)
  const [whatsAppMessage, setWhatsAppMessage] = useState('')

  useEffect(() => {
    if (isOpen) {
      fetchClasses()
      fetchParents()
      // If initialParentId is provided, set it and change audience to 'individual'
      if (initialParentId) {
        setFormData(prev => ({
          ...prev,
          audience: 'individual',
          parentId: initialParentId,
          classId: ''
        }))
      } else if (initialClassId) {
        // If initialClassId is provided, set it and change audience to 'class'
        setFormData(prev => ({
          ...prev,
          audience: 'class',
          classId: initialClassId,
          parentId: ''
        }))
      } else {
        // Reset form when opening without initial values
        setFormData({
          title: '',
          message: '',
          audience: 'all',
          classId: '',
          parentId: '',
          showOnAnnouncements: true
        })
      }
    }
  }, [isOpen, initialClassId, initialParentId])

  const fetchClasses = async () => {
    setLoadingClasses(true)
    try {
      const response = await fetch('/api/classes')
      if (response.ok) {
        const data = await response.json()
        setClasses(data)
      }
    } catch (error) {
    } finally {
      setLoadingClasses(false)
    }
  }

  const fetchParents = async () => {
    setLoadingParents(true)
    try {
      const response = await fetch('/api/parents')
      if (response.ok) {
        const data = await response.json()
        setParents(data)
      }
    } catch (error) {
    } finally {
      setLoadingParents(false)
    }
  }

  const getWhatsAppMessage = async (): Promise<string> => {
    // Get org name from API
    let orgName = 'Madrasah'
    try {
      const response = await fetch('/api/settings/organisation')
      if (response.ok) {
        const data = await response.json()
        orgName = data.name || orgName
      }
    } catch (error) {
    }
    
    return `📢 *Madrasah Announcement*\n\n*${formData.title}*\n\n${formData.message}\n\nJazakAllah Khair\n\n– ${orgName}`
  }

  const handleCopyForWhatsApp = async () => {
    if (!formData.title || !formData.message) {
      toast.error('Please fill in title and message first')
      return
    }

    if (formData.audience === 'class' && !formData.classId) {
      toast.error('Please select a class')
      return
    }

    if (formData.audience === 'individual' && !formData.parentId) {
      toast.error('Please select a parent')
      return
    }

    // Save message to database (so it appears in parent portal) without sending emails
    setLoading(true)
    try {
      // Build request body, only including classIds/parentId if needed
      const requestBody: any = {
        title: formData.title,
        body: formData.message,
        audience: formData.audience.toUpperCase(),
        channel: 'WHATSAPP',
        saveOnly: true,
        showOnAnnouncements: formData.showOnAnnouncements
      }
      
      if (formData.audience === 'class' && formData.classId) {
        requestBody.classIds = [formData.classId]
      }
      
      if (formData.audience === 'individual' && formData.parentId) {
        requestBody.parentId = formData.parentId
      }
      
      // Save message to DB without sending emails
      const response = await fetch('/api/messages/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })
      
      if (!response.ok) {
        let errorMessage = 'Failed to save message'
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
          if (errorData.details) {
          }
        } catch (e) {
          // If response is not JSON, use status text
          errorMessage = `Failed to save message (${response.status})`
        }
        throw new Error(errorMessage)
      }
      
      // Refresh messages list
      if (onMessageSent) {
        onMessageSent()
      }
      
      // Close main modal
      onClose()
      
      // Show WhatsApp message modal
      const whatsappText = await getWhatsAppMessage()
      setWhatsAppMessage(whatsappText)
      setShowWhatsAppModal(true)
      
      // Reset form
      setFormData({
        title: '',
        message: '',
        audience: 'all',
        classId: '',
        parentId: '',
        showOnAnnouncements: true
      })
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to save message. Please try again.'
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleCopyWhatsAppMessage = () => {
    navigator.clipboard.writeText(whatsAppMessage)
    toast.success('Copied to clipboard!')
  }

  const handleSendEmail = async () => {
    if (!formData.title || !formData.message) {
      toast.error('Please fill in title and message')
      return
    }

    if (formData.audience === 'class' && !formData.classId) {
      toast.error('Please select a class')
      return
    }

    if (formData.audience === 'individual' && !formData.parentId) {
      toast.error('Please select a parent')
      return
    }

    setLoading(true)
    
    // Show immediate feedback to user
    const sendingToast = toast.loading('Sending emails...', {
      description: 'Please wait while we send your message to all recipients.'
    })
    
    try {
      // Send via email - explicitly use EMAIL channel and saveOnly=false
      const response = await fetch('/api/messages/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: formData.title,
          body: formData.message,
          audience: formData.audience.toUpperCase(),
          channel: 'EMAIL',
          classIds: formData.audience === 'class' ? [formData.classId] : undefined,
          parentId: formData.audience === 'individual' ? formData.parentId : undefined,
          saveOnly: false,
          showOnAnnouncements: formData.showOnAnnouncements
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to send email')
      }
      
      const result = await response.json()
      
      // Dismiss loading toast and show success
      toast.dismiss(sendingToast)
      
      // Refresh messages list
      if (onMessageSent) {
        onMessageSent()
      }
      
      // Close main modal
      onClose()
      
      // Reset form
      setFormData({
        title: '',
        message: '',
        audience: 'all',
        classId: '',
        parentId: '',
        showOnAnnouncements: true
      })
      
      // Show success message with details
      const successMessage = result.recipients > 0
        ? `Email sent successfully to ${result.successCount} recipient${result.successCount !== 1 ? 's' : ''}!`
        : 'Email sent successfully!'
      
      toast.success(successMessage, {
        description: result.failureCount > 0 
          ? `${result.failureCount} email${result.failureCount !== 1 ? 's' : ''} failed to send.`
          : undefined
      })
    } catch (error: any) {
      // Dismiss loading toast and show error
      toast.dismiss(sendingToast)
      toast.error('Failed to send email', {
        description: error?.message || 'Please try again.'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    // Prevent closing while sending
    if (loading) {
      return
    }
    setFormData({
      title: '',
      message: '',
      audience: 'all',
      classId: '',
      parentId: '',
      showOnAnnouncements: true
    })
    onClose()
  }

  return (
    <>
    <Modal isOpen={isOpen} onClose={loading ? () => {} : handleCancel} title="New Message">
      <div className="space-y-6 relative">
        {loading && (
          <div className="absolute inset-0 bg-[var(--card)]/95 backdrop-blur-sm z-50 flex items-center justify-center rounded-lg -m-4 sm:-m-6">
            <div className="flex flex-col items-center gap-3 p-6 bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-lg">
              <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
              <div className="text-center">
                <p className="font-medium text-[var(--foreground)]">Sending emails...</p>
                <p className="text-sm text-[var(--muted-foreground)] mt-1">This may take a few moments</p>
              </div>
            </div>
          </div>
        )}
        <div>
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            placeholder="Enter message title"
            required
          />
        </div>

        <div>
          <Label htmlFor="message">Message</Label>
          <Textarea
            id="message"
            value={formData.message}
            onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
            placeholder="Enter your message..."
            rows={6}
            required
          />
        </div>

        <div>
          <Label htmlFor="audience">Audience</Label>
          <Select
            value={formData.audience}
            onValueChange={(value) => setFormData(prev => ({ ...prev, audience: value as 'all' | 'class' | 'individual', classId: '', parentId: '' }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select audience" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All parents</SelectItem>
              <SelectItem value="class">Specific class</SelectItem>
              <SelectItem value="individual">Individual parent</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {formData.audience === 'class' && (
          <div>
            <Label htmlFor="class">Select Class</Label>
            <Select
              value={formData.classId}
              onValueChange={(value) => setFormData(prev => ({ ...prev, classId: value }))}
              disabled={loadingClasses}
            >
              <SelectTrigger>
                <SelectValue placeholder={loadingClasses ? "Loading classes..." : "Choose a class"} />
              </SelectTrigger>
              <SelectContent>
                {[...classes]
                  .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
                  .map((cls) => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {formData.audience === 'individual' && (
          <div>
            <Label htmlFor="parent">Select Parent</Label>
            <Select
              value={formData.parentId}
              onValueChange={(value) => setFormData(prev => ({ ...prev, parentId: value }))}
              disabled={loadingParents}
            >
              <SelectTrigger>
                <SelectValue placeholder={loadingParents ? "Loading parents..." : "Choose a parent"} />
              </SelectTrigger>
              <SelectContent>
                {[...parents]
                  .sort((a, b) => {
                    const aName = a.name || a.email || ''
                    const bName = b.name || b.email || ''
                    return aName.localeCompare(bName, undefined, { sensitivity: 'base' })
                  })
                  .map((parent) => (
                  <SelectItem key={parent.id} value={parent.id}>
                    {parent.name || parent.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex items-center justify-between p-4 bg-[var(--accent)]/30 rounded-lg border border-[var(--border)]">
          <div className="flex-1">
            <Label htmlFor="showOnAnnouncements" className="text-sm font-medium text-[var(--foreground)] cursor-pointer">
              Show on Announcements Page
            </Label>
            <p className="text-xs text-[var(--muted-foreground)] mt-1">
              This message will appear on the parent portal announcements page for all relevant parents
            </p>
          </div>
          <Switch
            id="showOnAnnouncements"
            checked={formData.showOnAnnouncements}
            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, showOnAnnouncements: checked }))}
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="outline" onClick={handleCancel}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button type="button" variant="outline" onClick={handleCopyForWhatsApp} disabled={loading}>
            {loading ? 'Saving...' : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Copy For WhatsApp
              </>
            )}
          </Button>
          <Button type="button" onClick={handleSendEmail} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send via Email
              </>
            )}
          </Button>
        </div>
      </div>

    </Modal>

    {/* WhatsApp Message Modal - Separate modal with higher z-index */}
    {showWhatsAppModal && (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-white/20 backdrop-blur-md"
          onClick={() => setShowWhatsAppModal(false)}
        />
        
        {/* Modal */}
        <div className="relative bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-xl w-[95vw] sm:w-[90vw] md:w-[75vw] max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-[var(--border)] flex-shrink-0">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">WhatsApp Message</h2>
            <button
              onClick={() => setShowWhatsAppModal(false)}
              className="p-1 rounded-md hover:bg-[var(--accent)] transition-colors"
            >
              <X className="h-4 w-4 text-[var(--muted-foreground)]" />
            </button>
          </div>
          
          {/* Content */}
          <div className="p-6 overflow-y-auto flex-1">
            <div className="space-y-4">
              <p className="text-sm text-[var(--muted-foreground)]">
                Copy this message and send it via your WhatsApp channel or group:
              </p>
              <div className="bg-[var(--muted)] border border-[var(--border)] rounded-lg p-4">
                <pre className="whitespace-pre-wrap text-sm text-[var(--foreground)] font-mono">
                  {whatsAppMessage}
                </pre>
              </div>
              <div className="flex justify-end space-x-3">
                <Button type="button" variant="outline" onClick={() => setShowWhatsAppModal(false)}>
                  Close
                </Button>
                <Button type="button" onClick={handleCopyWhatsAppMessage}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Message
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )}
  </>
  )
}
