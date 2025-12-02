'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Target,
  Users,
  TrendingUp,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  ArrowRight,
  Phone,
  Mail,
  MessageSquare,
  FileText,
  DollarSign,
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import { ViewLeadModal } from '@/components/view-lead-modal'
import { LeadEmailComposerModal } from '@/components/lead-email-composer-modal'

interface DashboardStats {
  totalLeads: number
  newLeadsThisWeek: number
  activeLeads: number
  demosBooked: number
  wonLeads: number
  lostLeads: number
  conversionRate: number
  potentialMRR: number
}

interface FollowUp {
  id: string
  orgName: string
  status: string
  nextContactAt: string
  AssignedTo: {
    id: string
    name: string | null
    email: string | null
  } | null
  lastCallOutcome?: string | null
  hasCallActivity?: boolean
}

interface EmailTask {
  id: string
  orgName: string
  contactName: string | null
  contactEmail: string | null
  lastEmailStage: string | null
  nextContactAt: string
  lastEmailSentAt: string | null
}

interface RecentActivity {
  id: string
  type: string
  description: string
  createdAt: string
  Lead: {
    id: string
    orgName: string
  }
  CreatedBy: {
    id: string
    name: string | null
    email: string | null
  } | null
}

export default function LeadsDashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [followUps, setFollowUps] = useState<FollowUp[]>([])
  const [emailTasks, setEmailTasks] = useState<EmailTask[]>([])
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)
  const [isEmailComposerOpen, setIsEmailComposerOpen] = useState(false)
  const [shouldOpenLogCall, setShouldOpenLogCall] = useState(false)
  const [selectedEmailLead, setSelectedEmailLead] = useState<EmailTask | null>(null)

  useEffect(() => {
    if (status === 'loading') return
    if (!session?.user?.id || !session.user.isSuperAdmin) {
      router.push('/auth/signin')
      return
    }
    loadData()
  }, [session, status, router])

  const loadData = async () => {
    try {
      const res = await fetch('/api/owner/leads/dashboard/stats')
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || `Failed to load stats (${res.status})`)
      }
      const data = await res.json()
      setStats(data.stats)
      setFollowUps(data.todayFollowUps || [])
      setEmailTasks(data.emailTasks || [])
      setRecentActivities(data.recentActivities || [])
    } catch (error: any) {
      console.error('Error loading dashboard:', error)
      toast.error(error.message || 'Failed to load dashboard data')
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await loadData()
    setIsRefreshing(false)
    toast.success('Dashboard refreshed')
  }

  const handleQuickAction = async (leadId: string, action: string, value?: any) => {
    try {
      const res = await fetch(`/api/owner/leads/${leadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          [action]: value,
          createStatusChangeActivity: true,
        }),
      })
      if (!res.ok) throw new Error('Failed to update lead')
      await loadData()
      toast.success('Lead updated')
    } catch (error) {
      console.error('Error updating lead:', error)
      toast.error('Failed to update lead')
    }
  }

  const formatStatus = (status: string) => {
    return status
      .split('_')
      .map(word => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ')
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      NEW: 'bg-blue-100 text-blue-700',
      CONTACTED: 'bg-yellow-100 text-yellow-700',
      FOLLOW_UP: 'bg-orange-100 text-orange-700',
      DEMO_BOOKED: 'bg-purple-100 text-purple-700',
      WON: 'bg-green-100 text-green-700',
      LOST: 'bg-red-100 text-red-700',
      ON_HOLD: 'bg-gray-100 text-gray-700',
    }
    return colors[status] || 'bg-gray-100 text-gray-700'
  }

  const getActivityIcon = (type: string) => {
    const icons: Record<string, any> = {
      CALL: Phone,
      WHATSAPP: MessageSquare,
      EMAIL: Mail,
      MEETING: Calendar,
      NOTE: FileText,
      STATUS_CHANGE: RefreshCw,
    }
    return icons[type] || FileText
  }

  if (status === 'loading' || !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6 w-full min-w-0">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-start w-full min-w-0">
        <div className="flex-1 min-w-0 pr-0 md:pr-4">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-[var(--foreground)] break-words">
            Leads Dashboard
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-[var(--muted-foreground)] break-words">
            Track madrasah leads, follow-ups, demos and conversions
          </p>
        </div>
        <div className="flex gap-2 shrink-0 w-full md:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex-1 md:flex-initial"
          >
            <RefreshCw className={`h-4 w-4 md:mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden md:inline">Refresh</span>
          </Button>
          <Button
            size="sm"
            onClick={() => router.push('/owner/leads')}
            className="flex-1 md:flex-initial"
          >
            <span className="hidden md:inline">View All Leads</span>
            <span className="md:hidden">All Leads</span>
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 w-full min-w-0">
        <Card className="w-full min-w-0">
          <CardHeader className="flex flex-row items-start sm:items-center justify-between space-y-0 pb-2 gap-2">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-xs sm:text-sm font-medium break-words">Total Leads</CardTitle>
            </div>
            <Target className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0 mt-1 sm:mt-0" />
          </CardHeader>
          <CardContent className="pt-2">
            <div className="text-xl sm:text-2xl font-bold break-words">{stats.totalLeads}</div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 break-words">
              {stats.newLeadsThisWeek} new this week
            </p>
          </CardContent>
        </Card>

        <Card className="w-full min-w-0">
          <CardHeader className="flex flex-row items-start sm:items-center justify-between space-y-0 pb-2 gap-2">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-xs sm:text-sm font-medium break-words">Active Leads</CardTitle>
            </div>
            <Users className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0 mt-1 sm:mt-0" />
          </CardHeader>
          <CardContent className="pt-2">
            <div className="text-xl sm:text-2xl font-bold break-words">{stats.activeLeads}</div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 break-words">
              {stats.demosBooked} demos booked
            </p>
          </CardContent>
        </Card>

        <Card className="w-full min-w-0">
          <CardHeader className="flex flex-row items-start sm:items-center justify-between space-y-0 pb-2 gap-2">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-xs sm:text-sm font-medium break-words">Conversion Rate</CardTitle>
            </div>
            <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0 mt-1 sm:mt-0" />
          </CardHeader>
          <CardContent className="pt-2">
            <div className="text-xl sm:text-2xl font-bold break-words">{stats.conversionRate}%</div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 break-words">
              {stats.wonLeads} won / {stats.lostLeads} lost
            </p>
          </CardContent>
        </Card>

        <Card className="w-full min-w-0">
          <CardHeader className="flex flex-row items-start sm:items-center justify-between space-y-0 pb-2 gap-2">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-xs sm:text-sm font-medium break-words">Potential MRR</CardTitle>
            </div>
            <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0 mt-1 sm:mt-0" />
          </CardHeader>
          <CardContent className="pt-2">
            <div className="text-xl sm:text-2xl font-bold break-words">£{stats.potentialMRR.toLocaleString()}</div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 break-words">
              From active leads
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Today's Follow-ups and Recent Activity */}
      <div className="flex flex-col gap-4 sm:gap-6 w-full min-w-0">
        {/* Today's Follow-ups */}
        <Card className="w-full min-w-0">
          <CardHeader>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-[var(--muted)] rounded-lg flex items-center justify-center flex-shrink-0">
                <Clock className="h-5 w-5 text-[var(--foreground)]" />
              </div>
              <CardTitle className="text-xl font-semibold text-[var(--foreground)]">
                Today&apos;s Follow-ups
              </CardTitle>
            </div>
            <p className="text-sm text-[var(--muted-foreground)]">
              Leads that need follow-up today
            </p>
          </CardHeader>
          <CardContent>
            {followUps.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-[var(--muted-foreground)] opacity-50" />
                <p className="text-sm text-[var(--muted-foreground)]">All caught up! No follow-ups for today.</p>
              </div>
            ) : (
              <div>
                {followUps.map((followUp, index) => (
                    <div key={followUp.id}>
                    <div
                      className="flex items-center gap-2 p-4 hover:bg-[var(--accent)] transition-colors cursor-pointer"
                      onClick={() => {
                        // Check if this is a call task and should open log call modal
                        const isCallTask = followUp.hasCallActivity && 
                          followUp.lastCallOutcome === 'Asked to call back later'
                        setSelectedLeadId(followUp.id)
                        setShouldOpenLogCall(isCallTask)
                        setIsViewModalOpen(true)
                      }}
                    >
                      <div className="flex items-center justify-between gap-4 flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-10 h-10 bg-[var(--muted)] rounded-lg flex items-center justify-center flex-shrink-0">
                            <Calendar className="h-5 w-5 text-[var(--foreground)]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-semibold text-[var(--foreground)] mb-1">
                              {followUp.orgName}
                            </h3>
                            <p className="text-sm text-[var(--muted-foreground)]">
                              {followUp.hasCallActivity && followUp.lastCallOutcome === 'Asked to call back later' 
                                ? `Call back today (${followUp.lastCallOutcome})`
                                : `Follow-up: ${formatDate(followUp.nextContactAt)}`}
                              {followUp.AssignedTo && ` • Assigned to: ${followUp.AssignedTo.name || followUp.AssignedTo.email}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge variant="outline" className={`text-xs ${getStatusColor(followUp.status)}`}>
                            {formatStatus(followUp.status)}
                          </Badge>
                          <ArrowRight className="h-4 w-4 text-[var(--muted-foreground)]" />
                        </div>
                      </div>
                    </div>
                    {index < followUps.length - 1 && (
                      <div className="border-b border-[var(--border)]" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Email Tasks Panel */}
        {emailTasks.length > 0 && (
          <Card className="w-full min-w-0">
            <CardHeader>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-[var(--muted)] rounded-lg flex items-center justify-center flex-shrink-0">
                  <Mail className="h-5 w-5 text-[var(--foreground)]" />
                </div>
                <CardTitle className="text-xl font-semibold text-[var(--foreground)]">
                  Today&apos;s Email Tasks
                </CardTitle>
              </div>
              <p className="text-sm text-[var(--muted-foreground)]">
                Leads ready for email outreach follow-up
              </p>
            </CardHeader>
            <CardContent>
              <div>
                {emailTasks.map((task, index) => {
                  const getEmailLabel = () => {
                    if (!task.lastEmailStage) return 'Send initial email'
                    if (task.lastEmailStage === 'INITIAL') return 'Send follow-up email'
                    if (task.lastEmailStage === 'FOLLOW_UP_1') return 'Send second follow-up'
                    if (task.lastEmailStage === 'FOLLOW_UP_2') return 'Send final follow-up'
                    return 'Send email'
                  }

                  return (
                    <div key={task.id}>
                      <div className="flex items-center gap-2 p-4 hover:bg-[var(--accent)] transition-colors">
                        <div className="flex items-center justify-between gap-4 flex-1 min-w-0">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-10 h-10 bg-[var(--muted)] rounded-lg flex items-center justify-center flex-shrink-0">
                              <Mail className="h-5 w-5 text-[var(--foreground)]" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-sm font-semibold text-[var(--foreground)] mb-1">
                                {task.orgName}
                              </h3>
                              <p className="text-sm text-[var(--muted-foreground)]">
                                {getEmailLabel()} • {formatDate(task.nextContactAt)}
                                {task.contactName && ` • ${task.contactName}`}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <ArrowRight className="h-4 w-4 text-[var(--muted-foreground)]" />
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-shrink-0 h-8 px-3 text-xs"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            setSelectedEmailLead(task)
                            setIsEmailComposerOpen(true)
                          }}
                        >
                          <Mail className="h-3 w-3 mr-1" />
                          Compose
                        </Button>
                      </div>
                      {index < emailTasks.length - 1 && (
                        <div className="border-b border-[var(--border)]" />
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Activity */}
        <Card className="w-full min-w-0">
          <CardHeader>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-[var(--muted)] rounded-lg flex items-center justify-center flex-shrink-0">
                <FileText className="h-5 w-5 text-[var(--foreground)]" />
              </div>
              <CardTitle className="text-xl font-semibold text-[var(--foreground)]">
                Recent Activity
              </CardTitle>
            </div>
            <p className="text-sm text-[var(--muted-foreground)]">
              Latest lead activities across all leads
            </p>
          </CardHeader>
          <CardContent>
            {recentActivities.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-[var(--muted-foreground)] opacity-50" />
                <p className="text-sm text-[var(--muted-foreground)]">No recent activity</p>
              </div>
            ) : (
              <div>
                {recentActivities.map((activity, index) => {
                  const Icon = getActivityIcon(activity.type)
                  return (
                    <div key={activity.id}>
                      <div
                        className="flex items-center gap-2 p-4 hover:bg-[var(--accent)] transition-colors cursor-pointer"
                        onClick={() => {
                          setSelectedLeadId(activity.Lead.id)
                          setIsViewModalOpen(true)
                        }}
                      >
                        <div className="flex items-center justify-between gap-4 flex-1 min-w-0">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-10 h-10 bg-[var(--muted)] rounded-lg flex items-center justify-center flex-shrink-0">
                              <Icon className="h-5 w-5 text-[var(--foreground)]" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-sm font-semibold text-[var(--foreground)] mb-1">
                                {activity.Lead.orgName}
                              </h3>
                              <p className="text-sm text-[var(--muted-foreground)]">
                                {activity.description}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-xs text-[var(--muted-foreground)]">
                              {formatDate(activity.createdAt)}
                            </span>
                            <ArrowRight className="h-4 w-4 text-[var(--muted-foreground)]" />
                          </div>
                        </div>
                      </div>
                      {index < recentActivities.length - 1 && (
                        <div className="border-b border-[var(--border)]" />
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* View Lead Modal */}
      {selectedLeadId && (
        <ViewLeadModal
          isOpen={isViewModalOpen}
          onClose={() => {
            setIsViewModalOpen(false)
            setSelectedLeadId(null)
            setShouldOpenLogCall(false)
          }}
          onUpdate={() => {
            loadData()
          }}
          leadId={selectedLeadId}
          autoOpenLogCall={shouldOpenLogCall}
        />
      )}

      {/* Email Composer Modal */}
      {selectedEmailLead && (
        <LeadEmailComposerModal
          isOpen={isEmailComposerOpen}
          onClose={() => {
            setIsEmailComposerOpen(false)
            setSelectedEmailLead(null)
          }}
          onSent={() => {
            loadData()
            setIsEmailComposerOpen(false)
            setSelectedEmailLead(null)
          }}
          lead={{
            id: selectedEmailLead.id,
            orgName: selectedEmailLead.orgName,
            contactName: selectedEmailLead.contactName,
            contactEmail: selectedEmailLead.contactEmail,
            lastEmailStage: selectedEmailLead.lastEmailStage,
            emailOutreachCompleted: false,
          }}
        />
      )}
    </div>
  )
}

