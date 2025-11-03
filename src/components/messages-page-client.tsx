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
  const [recentMessages, setRecentMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMessages()
  }, [])

  const fetchMessages = async () => {
    try {
      const response = await fetch('/api/messages')
      if (response.ok) {
        const data = await response.json()
        // Transform API data for frontend
        const transformed = data.map((msg: any) => ({
          id: msg.id,
          title: msg.title,
          audience: msg.audience?.toLowerCase() || 'all',
          sentAt: formatTimeAgo(new Date(msg.createdAt)),
          content: msg.body,
          status: msg.status?.toLowerCase() || 'sent'
        }))
        setRecentMessages(transformed)
      } else {
        console.error('Failed to fetch messages')
        setRecentMessages([])
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
      setRecentMessages([])
    } finally {
      setLoading(false)
    }
  }

  const formatTimeAgo = (date: Date): string => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
    return date.toLocaleDateString()
  }

  const handleSendMessage = async (data: MessageData) => {
    try {
      const response = await fetch('/api/messages/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: data.title,
          body: data.message,
          audience: data.audience.toUpperCase(),
          channel: data.channels[0]?.toUpperCase() || 'EMAIL',
          classIds: data.classId ? [data.classId] : undefined
        })
      })

      if (response.ok) {
        const newMessage = await response.json()
        // Refresh messages list
        fetchMessages()
      } else {
        console.error('Failed to send message')
        alert('Failed to send message. Please try again.')
      }
    } catch (error) {
      console.error('Error sending message:', error)
      alert('Error sending message. Please try again.')
    }
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




