'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { SendMessageModal } from './send-message-modal'
import { Plus } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface Message {
  id: string
  title: string
  body: string
  audience: string
  createdAt: string
  targets: string | null
}

export function MessagesPageClient() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMessages()
  }, [])

  const fetchMessages = async () => {
    try {
      const response = await fetch('/api/messages')
      if (response.ok) {
        const data = await response.json()
        setMessages(data)
      } else {
        console.error('Failed to fetch messages')
        setMessages([])
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
      setMessages([])
    } finally {
      setLoading(false)
    }
  }

  const getAudienceDisplay = (message: Message): string => {
    try {
      const targets = message.targets ? JSON.parse(message.targets) : {}
      if (targets.audienceDisplayName) {
        return targets.audienceDisplayName
      }
    } catch (e) {
      // Ignore parse errors
    }
    
    // Fallback to audience type
    switch (message.audience) {
      case 'ALL':
        return 'All parents'
      case 'BY_CLASS':
        return 'Specific class'
      case 'INDIVIDUAL':
        return 'Individual parent'
      default:
        return message.audience
    }
  }

  const handleSendMessage = async (data: any, saveOnly: boolean = false) => {
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
          channel: saveOnly ? 'WHATSAPP' : 'EMAIL',
          classIds: data.classId ? [data.classId] : undefined,
          parentId: data.parentId,
          saveOnly: saveOnly
        })
      })

      if (response.ok) {
        await fetchMessages()
        setIsModalOpen(false)
      } else {
        console.error('Failed to send message')
        alert('Failed to send message. Please try again.')
      }
    } catch (error) {
      console.error('Error sending message:', error)
      alert('Error sending message. Please try again.')
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
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Message
        </Button>
      </div>

      {/* Messages List */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Message History</h3>
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading messages...</div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No messages have been sent yet.
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div key={message.id} className="border-b border-gray-200 pb-4 last:border-b-0 last:pb-0">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">{message.title}</div>
                      <div className="text-sm text-gray-500 mt-1">
                        Sent to {getAudienceDisplay(message)} • {formatDate(new Date(message.createdAt))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <SendMessageModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSend={handleSendMessage}
      />
    </div>
  )
}
