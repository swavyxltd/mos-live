'use client'

import { useState, useEffect, useRef } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Send, Users, User, BookOpen } from 'lucide-react'

interface SendMessageModalProps {
  isOpen: boolean
  onClose: () => void
  messageType: 'all' | 'class' | 'individual'
  onSend: (data: MessageData) => Promise<void>
}

interface MessageData {
  title: string
  message: string
  audience: 'all' | 'class' | 'individual'
  classId?: string
  parentId?: string
  channels: ('email' | 'whatsapp')[]
}

export function SendMessageModal({ isOpen, onClose, messageType, onSend }: SendMessageModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    classId: '',
    parentId: '',
    channels: ['email'] as ('email' | 'whatsapp')[]
  })
  const [loading, setLoading] = useState(false)
  const [parentSearch, setParentSearch] = useState('')
  const [showParentDropdown, setShowParentDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowParentDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Demo data for classes and parents
  const demoClasses = [
    { id: 'class-1', name: 'Quran Recitation - Level 1', teacher: 'Moulana Omar' },
    { id: 'class-2', name: 'Islamic Studies - Level 2', teacher: 'Apa Aisha' },
    { id: 'class-3', name: 'Arabic Grammar', teacher: 'Hassan Ali' },
    { id: 'class-4', name: 'Hadith Studies', teacher: 'Fatima Ahmed' }
  ]

  // Generate a larger demo dataset to simulate 500 parents
  const generateDemoParents = () => {
    const firstNames = ['Ahmed', 'Aisha', 'Mohammed', 'Fatima', 'Omar', 'Khadija', 'Hassan', 'Amina', 'Ibrahim', 'Zainab', 'Yusuf', 'Maryam', 'Ali', 'Khadija', 'Umar', 'Aisha', 'Abdullah', 'Fatima', 'Hamza', 'Zara']
    const lastNames = ['Khan', 'Patel', 'Ali', 'Hassan', 'Ahmed', 'Malik', 'Sheikh', 'Rahman', 'Hussain', 'Iqbal', 'Choudhury', 'Mahmood', 'Akhtar', 'Bashir', 'Farooq', 'Nadeem', 'Qureshi', 'Rashid', 'Siddiqui', 'Tariq']
    
    return Array.from({ length: 500 }, (_, i) => ({
      id: `parent-${i + 1}`,
      name: `${firstNames[i % firstNames.length]} ${lastNames[i % lastNames.length]}`,
      email: `parent${i + 1}@email.com`,
      phone: `+44 7700 ${String(900000 + i).padStart(6, '0')}`,
      studentName: `Student ${i + 1}`,
      class: `Class ${(i % 8) + 1}`
    }))
  }

  const demoParents = generateDemoParents()

  // Filter parents based on search
  const filteredParents = demoParents.filter(parent => 
    parent.name.toLowerCase().includes(parentSearch.toLowerCase()) ||
    parent.email.toLowerCase().includes(parentSearch.toLowerCase()) ||
    parent.studentName.toLowerCase().includes(parentSearch.toLowerCase())
  ).slice(0, 10) // Show only first 10 results

  const selectedParent = demoParents.find(p => p.id === formData.parentId)

  const handleParentSelect = (parentId: string) => {
    setFormData(prev => ({ ...prev, parentId }))
    setShowParentDropdown(false)
    setParentSearch('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const messageData: MessageData = {
        title: formData.title,
        message: formData.message,
        audience: messageType,
        classId: messageType === 'class' ? formData.classId : undefined,
        parentId: messageType === 'individual' ? formData.parentId : undefined,
        channels: formData.channels
      }

      await onSend(messageData)
      
      // Reset form
      setFormData({
        title: '',
        message: '',
        classId: '',
        parentId: '',
        channels: ['email']
      })
      onClose()
    } catch (error) {
      console.error('Error sending message:', error)
      alert('Failed to send message')
    } finally {
      setLoading(false)
    }
  }

  const handleChannelToggle = (channel: 'email' | 'whatsapp') => {
    setFormData(prev => ({
      ...prev,
      channels: prev.channels.includes(channel)
        ? prev.channels.filter(c => c !== channel)
        : [...prev.channels, channel]
    }))
  }

  const getTitle = () => {
    switch (messageType) {
      case 'all': return 'Send Message to All Parents'
      case 'class': return 'Send Message to Specific Class'
      case 'individual': return 'Send Message to Individual Parent'
      default: return 'Send Message'
    }
  }

  const getDescription = () => {
    switch (messageType) {
      case 'all': return 'Send an announcement to all parents in your organization'
      case 'class': return 'Send a message to parents of a specific class'
      case 'individual': return 'Send a personal message to a specific parent'
      default: return ''
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={getTitle()}>
      <div className="space-y-6">
        <p className="text-sm text-gray-600">{getDescription()}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Message Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Enter message title"
              required
            />
          </div>

          {messageType === 'class' && (
            <div>
              <Label htmlFor="class">Select Class</Label>
              <Select value={formData.classId} onValueChange={(value) => setFormData(prev => ({ ...prev, classId: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a class" />
                </SelectTrigger>
                <SelectContent>
                  {demoClasses.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name} - {cls.teacher}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {messageType === 'individual' && (
            <div className="relative" ref={dropdownRef}>
              <Label htmlFor="parent">Select Parent</Label>
              <div className="relative">
                <Input
                  id="parent"
                  value={parentSearch}
                  onChange={(e) => {
                    setParentSearch(e.target.value)
                    setShowParentDropdown(true)
                  }}
                  onFocus={() => setShowParentDropdown(true)}
                  placeholder="Search parents by name, email, or student name..."
                  className="w-full"
                />
                {showParentDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {filteredParents.length > 0 ? (
                      filteredParents.map((parent) => (
                        <div
                          key={parent.id}
                          className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                          onClick={() => handleParentSelect(parent.id)}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-medium text-gray-900">{parent.name}</div>
                              <div className="text-sm text-gray-500">{parent.email}</div>
                              <div className="text-xs text-gray-400">
                                Student: {parent.studentName} • {parent.class}
                              </div>
                            </div>
                            <div className="text-xs text-gray-400">{parent.phone}</div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-gray-500 text-sm">
                        No parents found matching "{parentSearch}"
                      </div>
                    )}
                  </div>
                )}
              </div>
              {selectedParent && (
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium text-blue-900">{selectedParent.name}</div>
                      <div className="text-sm text-blue-700">{selectedParent.email}</div>
                      <div className="text-xs text-blue-600">
                        Student: {selectedParent.studentName} • {selectedParent.class}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, parentId: '' }))
                        setParentSearch('')
                      }}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Change
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div>
            <Label htmlFor="message">Message Content</Label>
            <Textarea
              id="message"
              value={formData.message}
              onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
              placeholder="Enter your message..."
              rows={4}
              required
            />
          </div>

          <div>
            <Label>Delivery Channels</Label>
            <div className="flex space-x-4 mt-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.channels.includes('email')}
                  onChange={() => handleChannelToggle('email')}
                  className="rounded"
                />
                <span className="text-sm">Email</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.channels.includes('whatsapp')}
                  onChange={() => handleChannelToggle('whatsapp')}
                  className="rounded"
                />
                <span className="text-sm">WhatsApp</span>
              </label>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              In demo mode, messages will be logged to console instead of being sent
            </p>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || formData.channels.length === 0}>
              {loading ? 'Sending...' : 'Send Message'}
              <Send className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}
