'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Send, Copy, X } from 'lucide-react'
import { toast } from 'sonner'

interface SendMessageModalProps {
  isOpen: boolean
  onClose: () => void
  onSend: (data: MessageData) => Promise<void>
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

export function SendMessageModal({ isOpen, onClose, onSend }: SendMessageModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    audience: 'all' as 'all' | 'class' | 'individual',
    classId: '',
    parentId: ''
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
    }
  }, [isOpen])

  const fetchClasses = async () => {
    setLoadingClasses(true)
    try {
      const response = await fetch('/api/classes')
      if (response.ok) {
        const data = await response.json()
        setClasses(data)
      }
    } catch (error) {
      console.error('Error fetching classes:', error)
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
      console.error('Error fetching parents:', error)
    } finally {
      setLoadingParents(false)
    }
  }

  const getWhatsAppMessage = async (): Promise<string> => {
    // Get org name from API
    let orgName = 'Madrasah'
    try {
      const response = await fetch('/api/settings/organization')
      if (response.ok) {
        const data = await response.json()
        orgName = data.name || orgName
      }
    } catch (error) {
      console.error('Error fetching org name:', error)
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
      // Save message to DB without sending emails
      const response = await fetch('/api/messages/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: formData.title,
          body: formData.message,
          audience: formData.audience.toUpperCase(),
          channel: 'WHATSAPP',
          classIds: formData.audience === 'class' ? [formData.classId] : undefined,
          parentId: formData.audience === 'individual' ? formData.parentId : undefined,
          saveOnly: true
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to save message')
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
        parentId: ''
      })
    } catch (error) {
      console.error('Error saving message:', error)
      toast.error('Failed to save message. Please try again.')
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
    try {
      await onSend({
        title: formData.title,
        message: formData.message,
        audience: formData.audience,
        classId: formData.audience === 'class' ? formData.classId : undefined,
        parentId: formData.audience === 'individual' ? formData.parentId : undefined
      })
      
      // Close main modal
      onClose()
      
      // Show WhatsApp message after email is sent
      const whatsappText = await getWhatsAppMessage()
      setWhatsAppMessage(whatsappText)
      setShowWhatsAppModal(true)
      
      // Reset form
      setFormData({
        title: '',
        message: '',
        audience: 'all',
        classId: '',
        parentId: ''
      })
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setFormData({
      title: '',
      message: '',
      audience: 'all',
      classId: '',
      parentId: ''
    })
    onClose()
  }

  return (
    <>
    <Modal isOpen={isOpen} onClose={handleCancel} title="New Message">
      <div className="space-y-6">
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
                {classes.map((cls) => (
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
                {parents.map((parent) => (
                  <SelectItem key={parent.id} value={parent.id}>
                    {parent.name || parent.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="outline" onClick={handleCancel}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button type="button" variant="outline" onClick={handleCopyForWhatsApp}>
            <Copy className="h-4 w-4 mr-2" />
            Copy For WhatsApp
          </Button>
          <Button type="button" onClick={handleSendEmail} disabled={loading}>
            {loading ? 'Sending...' : (
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
          className="fixed inset-0 bg-black/50 backdrop-blur-sm"
          onClick={() => setShowWhatsAppModal(false)}
        />
        
        {/* Modal */}
        <div className="relative bg-white border border-gray-100 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-100 flex-shrink-0">
            <h2 className="text-lg font-semibold text-gray-900">WhatsApp Message</h2>
            <button
              onClick={() => setShowWhatsAppModal(false)}
              className="p-1 rounded-md hover:bg-gray-100 transition-colors"
            >
              <X className="h-4 w-4 text-gray-500" />
            </button>
          </div>
          
          {/* Content */}
          <div className="p-6 overflow-y-auto flex-1">
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Copy this message and send it via your WhatsApp channel or group:
              </p>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <pre className="whitespace-pre-wrap text-sm text-gray-900 font-mono">
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
