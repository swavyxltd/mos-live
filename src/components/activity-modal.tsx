'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Activity, 
  User, 
  FileText, 
  Users, 
  DollarSign, 
  MessageSquare, 
  UserCheck,
  BookOpen,
  X,
  ChevronLeft,
  ChevronRight,
  Loader2
} from 'lucide-react'
import { formatDateTime } from '@/lib/utils'

interface ActivityLog {
  id: string
  action: string
  actionText: string
  actionIcon: string
  targetType: string
  targetId: string | null
  data: any
  user: {
    id: string
    name: string
    email: string
    role: string
  } | null
  createdAt: string
  timestamp: string
}

interface ActivityModalProps {
  isOpen: boolean
  onClose: () => void
}

const actionIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  'DollarSign': DollarSign,
  'Users': Users,
  'BookOpen': BookOpen,
  'MessageSquare': MessageSquare,
  'UserCheck': UserCheck,
  'FileText': FileText,
  'User': User,
  'Activity': Activity
}

export function ActivityModal({ isOpen, onClose }: ActivityModalProps) {
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [users, setUsers] = useState<Array<{ id: string; name: string; email: string; role: string }>>([])
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchActivity()
    } else {
      // Reset when modal closes
      setPage(1)
      setSelectedUserId('')
    }
  }, [isOpen, page, selectedUserId])

  const fetchActivity = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10'
      })
      if (selectedUserId) {
        params.append('userId', selectedUserId)
      }

      const response = await fetch(`/api/activity?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setLogs(data.logs || [])
        setUsers(data.users || [])
        setTotalPages(data.pagination?.totalPages || 1)
        setTotal(data.pagination?.total || 0)
      } else {
        setLogs([])
      }
    } catch (error) {
      setLogs([])
    } finally {
      setLoading(false)
    }
  }

  const getActionColor = (action: string) => {
    if (action.includes('PAYMENT') || action.includes('INVOICE')) {
      return 'bg-blue-100 text-blue-700'
    } else if (action.includes('STUDENT')) {
      return 'bg-green-100 text-green-700'
    } else if (action.includes('CLASS')) {
      return 'bg-purple-100 text-purple-700'
    } else if (action.includes('MESSAGE')) {
      return 'bg-orange-100 text-orange-700'
    } else if (action.includes('ATTENDANCE')) {
      return 'bg-indigo-100 text-indigo-700'
    }
    return 'bg-gray-100 text-gray-700'
  }

  const formatActionDetails = (log: ActivityLog) => {
    if (log.data) {
      if (log.action.includes('PAYMENT')) {
        return log.data.amount ? `£${(log.data.amount / 100).toFixed(2)}` : ''
      } else if (log.action.includes('STUDENT')) {
        return log.data.studentName || log.data.firstName || ''
      } else if (log.action.includes('MESSAGE')) {
        return log.data.recipientCount ? `${log.data.recipientCount} recipients` : ''
      }
    }
    return ''
  }

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose}
      title="Activity Log"
    >
      <div className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <Select value={selectedUserId || 'all'} onValueChange={(value) => {
              setSelectedUserId(value === 'all' ? '' : value)
              setPage(1)
            }}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by user" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name} ({user.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="text-sm text-[var(--muted-foreground)]">
            {total} total activities
          </div>
        </div>

        {/* Activity List */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-[var(--muted-foreground)]" />
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-12">
                <Activity className="h-12 w-12 mx-auto mb-4 text-[var(--muted-foreground)]" />
                <p className="text-sm text-[var(--muted-foreground)]">No activity found</p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {logs.map((log) => {
                  const Icon = actionIcons[log.actionIcon] || Activity
                  const actionColor = getActionColor(log.action)
                  const details = formatActionDetails(log)

                  return (
                    <div key={log.id} className="p-4 hover:bg-[var(--muted)]/50 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${actionColor}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-[var(--foreground)]">
                                {log.user?.name || log.user?.email || 'System'}
                                {log.user?.role && (
                                  <span className="ml-2 text-sm font-normal text-[var(--muted-foreground)]">
                                    ({log.user.role})
                                  </span>
                                )}
                              </p>
                              <p className="text-sm text-[var(--foreground)] mt-1">
                                {log.actionText}
                                {details && (
                                  <span className="text-[var(--muted-foreground)]"> • {details}</span>
                                )}
                                {log.targetType && (
                                  <span className="text-[var(--muted-foreground)]"> • {log.targetType}</span>
                                )}
                              </p>
                              <p className="text-sm text-[var(--muted-foreground)] mt-1">
                                {new Date(log.createdAt).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-[var(--muted-foreground)]">
              Page {page} of {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || loading}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

