'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { SendMessageModal } from './send-message-modal'
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface Message {
  id: string
  title: string
  body: string
  audience: string
  channel: string
  createdAt: string
  targets: string | null
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export function MessagesPageClient() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  })

  useEffect(() => {
    fetchMessages(page)
  }, [page])

  const fetchMessages = async (currentPage: number = 1) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/messages?page=${currentPage}&limit=10`)
      if (response.ok) {
        const data = await response.json()
        setMessages(data.messages || [])
        setPagination(data.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 })
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

  const getChannelDisplay = (message: Message): string => {
    switch (message.channel) {
      case 'EMAIL':
        return 'Email'
      case 'WHATSAPP':
        return 'WhatsApp'
      default:
        return message.channel || 'Email'
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
        await fetchMessages(page)
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
                        Sent to {getAudienceDisplay(message)} via {getChannelDisplay(message)} • {formatDate(new Date(message.createdAt))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {!loading && messages.length > 0 && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-200 pt-4 mt-4">
              <div className="text-sm text-gray-500">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} messages
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <div className="text-sm text-gray-600">
                  Page {pagination.page} of {pagination.totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                  disabled={page === pagination.totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <SendMessageModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSend={handleSendMessage}
        onMessageSent={() => {
          // Reset to page 1 to see the new message
          setPage(1)
          fetchMessages(1)
        }}
      />
    </div>
  )
}
