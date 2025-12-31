'use client'

import { useState } from 'react'
import { formatDateTime } from '@/lib/utils'
import { Bell, ChevronDown, ChevronUp, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'

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
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set())

  const toggleMessage = (messageId: string) => {
    setExpandedMessages(prev => {
      const next = new Set(prev)
      if (next.has(messageId)) {
        next.delete(messageId)
      } else {
        next.add(messageId)
      }
      return next
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Announcements</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Important messages and updates from the madrasah.
        </p>
      </div>

      {messages.length === 0 ? (
        <div className="bg-[var(--card)] shadow rounded-lg border border-[var(--border)]">
          <div className="px-4 py-12 text-center">
            <Bell className="h-12 w-12 mx-auto mb-4 text-[var(--muted-foreground)] opacity-50" />
            <p className="text-sm text-[var(--muted-foreground)]">No announcements yet</p>
          </div>
        </div>
      ) : (
        <div className="bg-[var(--card)] shadow rounded-lg border border-[var(--border)] overflow-hidden">
          <div className="divide-y divide-[var(--border)]">
            {messages.map((message) => {
              const isExpanded = expandedMessages.has(message.id)
              const shouldTruncate = message.body.length > 250
              const displayText = isExpanded || !shouldTruncate 
                ? message.body 
                : message.body.slice(0, 250) + '...'

              return (
                <div 
                  key={message.id} 
                  className="group hover:bg-[var(--accent)]/30 transition-colors"
                >
                  <div className="p-4 sm:p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-[var(--muted)] rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-[var(--primary)]/10 transition-colors">
                        <MessageSquare className="h-5 w-5 text-[var(--foreground)]" />
                      </div>
                      
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="text-base sm:text-lg font-semibold text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors flex-1">
                            {message.title}
                          </h3>
                          <span className="text-xs text-[var(--muted-foreground)] whitespace-nowrap flex-shrink-0">
                            {formatDateTime(new Date(message.createdAt))}
                          </span>
                        </div>
                        
                        <div className="space-y-2">
                          <p className={`text-sm text-[var(--foreground)] whitespace-pre-wrap leading-relaxed ${!isExpanded && shouldTruncate ? 'line-clamp-4' : ''}`}>
                            {displayText}
                          </p>
                          
                          {shouldTruncate && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleMessage(message.id)}
                              className="h-auto p-0 text-xs text-[var(--primary)] hover:text-[var(--primary)] -ml-1"
                            >
                              {isExpanded ? (
                                <>
                                  <ChevronUp className="h-3.5 w-3.5 mr-1" />
                                  Show less
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="h-3.5 w-3.5 mr-1" />
                                  Show more
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

