'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { SendMessageModal } from './send-message-modal'
import { Plus, Send, Users, User, BookOpen } from 'lucide-react'

interface MessageData {
  title: string
  message: string
  audience: 'all' | 'class' | 'individual'
  classId?: string
  parentId?: string
  channels: ('email' | 'whatsapp')[]
}

export function MessagesPageClient() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [messageType, setMessageType] = useState<'all' | 'class' | 'individual'>('all')
  const [recentMessages, setRecentMessages] = useState([
    {
      id: '1',
      title: 'Holiday Announcement',
      audience: 'all',
      sentAt: '2 days ago',
      content: 'School will be closed for winter break from Dec 23 - Jan 2',
      status: 'sent'
    },
    {
      id: '2',
      title: 'Exam Schedule',
      audience: 'class',
      sentAt: '1 week ago',
      content: 'End of term exams will be held next week',
      status: 'sent'
    }
  ])

  const handleSendMessage = async (data: MessageData) => {
    console.log('📧 DEMO MESSAGE SENDING:', {
      type: data.audience,
      title: data.title,
      message: data.message,
      channels: data.channels,
      classId: data.classId,
      parentId: data.parentId
    })

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Add to recent messages
    const newMessage = {
      id: Date.now().toString(),
      title: data.title,
      audience: data.audience,
      sentAt: 'Just now',
      content: data.message,
      status: 'sent'
    }
    setRecentMessages(prev => [newMessage, ...prev])
  }

  const openModal = (type: 'all' | 'class' | 'individual') => {
    setMessageType(type)
    setIsModalOpen(true)
  }

  const getAudienceText = (audience: string) => {
    switch (audience) {
      case 'all': return 'all parents'
      case 'class': return 'specific class'
      case 'individual': return 'individual parent'
      default: return audience
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
          <p className="mt-1 text-sm text-gray-500">
            Send announcements and communicate with parents.
          </p>
        </div>
        <Button onClick={() => openModal('all')}>
          <Plus className="h-4 w-4 mr-2" />
          New Message
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Messages */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Messages</h3>
            <div className="space-y-4">
              {recentMessages.map((message) => (
                <div key={message.id} className="border-l-4 border-blue-400 pl-4">
                  <div className="text-sm font-medium text-gray-900">{message.title}</div>
                  <div className="text-sm text-gray-500">
                    Sent to {getAudienceText(message.audience)} • {message.sentAt}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">{message.content}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <Button 
                className="w-full justify-start" 
                variant="outline"
                onClick={() => openModal('all')}
              >
                <Users className="h-4 w-4 mr-2" />
                Send to All Parents
              </Button>
              <Button 
                className="w-full justify-start" 
                variant="outline"
                onClick={() => openModal('class')}
              >
                <BookOpen className="h-4 w-4 mr-2" />
                Send to Specific Class
              </Button>
              <Button 
                className="w-full justify-start" 
                variant="outline"
                onClick={() => openModal('individual')}
              >
                <User className="h-4 w-4 mr-2" />
                Send to Individual Parent
              </Button>
            </div>
          </div>
        </div>
      </div>

      <SendMessageModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        messageType={messageType}
        onSend={handleSendMessage}
      />
    </div>
  )
}

