import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDateTime } from '@/lib/utils'
import { MessageSquare, Mail, Smartphone } from 'lucide-react'

interface Announcement {
  id: string
  title: string
  body: string
  channel: 'EMAIL' | 'WHATSAPP'
  createdAt: Date
}

interface RecentAnnouncementsProps {
  announcements: Announcement[]
}

export function RecentAnnouncements({ announcements }: RecentAnnouncementsProps) {
  if (announcements.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Announcements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500 py-8">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No recent announcements</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Announcements</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {announcements.map((announcement) => (
            <div key={announcement.id} className="border-l-4 border-indigo-500 pl-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-gray-900">
                    {announcement.title}
                  </h4>
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                    {announcement.body}
                  </p>
                </div>
                <div className="ml-4 flex items-center space-x-2">
                  {announcement.channel === 'EMAIL' ? (
                    <Mail className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Smartphone className="h-4 w-4 text-gray-400" />
                  )}
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {formatDateTime(announcement.createdAt)}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
