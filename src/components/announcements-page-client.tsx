'use client'

import { formatDate } from '@/lib/utils'

interface Message {
  id: string
  title: string
  body: string
  createdAt: string
  audience: string
}

interface AnnouncementsPageClientProps {
  messages: Message[]
}

export function AnnouncementsPageClient({ messages }: AnnouncementsPageClientProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Announcements</h1>
        <p className="mt-1 text-sm text-gray-500">
          Important messages and updates from the madrasah.
        </p>
      </div>

      {messages.length === 0 ? (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-12 text-center">
            <p className="text-gray-500">No announcements at this time.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {messages.map((message) => (
            <div key={message.id} className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-lg font-medium text-gray-900">{message.title}</h3>
                  <span className="text-sm text-gray-500">{formatDate(new Date(message.createdAt))}</span>
                </div>
                <div className="text-gray-700 whitespace-pre-wrap">{message.body}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

