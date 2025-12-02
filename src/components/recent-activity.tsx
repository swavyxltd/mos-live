import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDateTime } from '@/lib/utils'
import { Activity, User, FileText, Users, CreditCard, MessageSquare } from 'lucide-react'

interface RecentActivityProps {
  logs?: Array<{
    id: string
    action: string
    targetType: string
    targetId: string | null
    createdAt: Date
    user: {
      name: string | null
      email: string | null
    } | null
  }>
}

const actionIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  'CREATE_USER': User,
  'UPDATE_USER': User,
  'CREATE_STUDENT': Users,
  'UPDATE_STUDENT': Users,
  'CREATE_INVOICE': FileText,
  'UPDATE_INVOICE': FileText,
  'CREATE_PAYMENT': CreditCard,
  'SEND_MESSAGE': MessageSquare,
  'DEFAULT': Activity
}

const actionLabels: Record<string, string> = {
  'CREATE_USER': 'Created user',
  'UPDATE_USER': 'Updated user',
  'CREATE_STUDENT': 'Added student',
  'UPDATE_STUDENT': 'Updated student',
  'CREATE_INVOICE': 'Created invoice',
  'UPDATE_INVOICE': 'Updated invoice',
  'CREATE_PAYMENT': 'Recorded payment',
  'SEND_MESSAGE': 'Sent message'
}

export function RecentActivity({ logs }: RecentActivityProps) {
  if (!logs || logs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500 py-8">
            <Activity className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No recent activity</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div>
          {logs.map((log, index) => {
            const Icon = actionIcons[log.action] || actionIcons.DEFAULT
            const actionLabel = actionLabels[log.action] || log.action.toLowerCase().replace(/_/g, ' ')
            const userName = log.user?.name || log.user?.email || 'System'
            
            return (
              <div key={log.id}>
                <div className="flex items-start space-x-3 py-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                    <Icon className="h-4 w-4 text-gray-600" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">
                    <span className="font-medium">{userName}</span>{' '}
                    {actionLabel}
                    {log.targetType && (
                      <span className="text-gray-500"> {log.targetType.toLowerCase()}</span>
                    )}
                  </p>
                  <p className="text-sm text-gray-500">
                    {formatDateTime(log.createdAt)}
                  </p>
                </div>
                </div>
                {index < logs.length - 1 && (
                  <div className="border-b border-[var(--border)]" />
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
