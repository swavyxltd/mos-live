import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDateTime } from '@/lib/utils'
import { Activity, User, Building2, CreditCard, MessageSquare } from 'lucide-react'

interface PlatformActivityLog {
  id: string
  action: string
  targetType: string
  targetId: string | null
  createdAt: Date
  user: {
    name: string | null
    email: string | null
  } | null
  org: {
    name: string
  } | null
}

interface RecentPlatformActivityProps {
  logs?: PlatformActivityLog[]
}

const actionIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  'CREATE_ORG': Building2,
  'UPDATE_ORG': Building2,
  'CREATE_USER': User,
  'UPDATE_USER': User,
  'CREATE_PAYMENT': CreditCard,
  'SEND_MESSAGE': MessageSquare,
  'DEFAULT': Activity
}

const actionLabels: Record<string, string> = {
  'CREATE_ORG': 'Created organization',
  'UPDATE_ORG': 'Updated organization',
  'CREATE_USER': 'Created user',
  'UPDATE_USER': 'Updated user',
  'CREATE_PAYMENT': 'Processed payment',
  'SEND_MESSAGE': 'Sent message'
}

export function RecentPlatformActivity({ logs }: RecentPlatformActivityProps) {
  if (!logs || logs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Platform Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500 py-8">
            <Activity className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No recent platform activity</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Platform Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {logs.map((log) => {
            const Icon = actionIcons[log.action] || actionIcons.DEFAULT
            const actionLabel = actionLabels[log.action] || log.action.toLowerCase().replace(/_/g, ' ')
            const userName = log.user?.name || log.user?.email || 'System'
            const orgName = log.org?.name
            
            return (
              <div key={log.id} className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <Icon className="h-4 w-4 text-purple-600" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">
                    <span className="font-medium">{userName}</span>{' '}
                    {actionLabel}
                    {orgName && (
                      <span className="text-gray-500"> in {orgName}</span>
                    )}
                    {log.targetType && (
                      <span className="text-gray-500"> {log.targetType.toLowerCase()}</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatDateTime(log.createdAt)}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
