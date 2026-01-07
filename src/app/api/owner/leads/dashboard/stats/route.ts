import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { withRateLimit } from '@/lib/api-middleware'

async function handleGET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || !session.user.isSuperAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay()) // Start of week (Sunday)
    startOfWeek.setHours(0, 0, 0, 0)

    const startOfToday = new Date(now)
    startOfToday.setHours(0, 0, 0, 0)

    // Get all counts in parallel
    const [
      totalLeads,
      newLeadsThisWeek,
      activeLeads,
      demosBooked,
      wonLeads,
      lostLeads,
      todayFollowUps,
      emailTasks,
      recentActivities,
    ] = await Promise.all([
      // Total leads
      prisma.lead.count(),

      // New leads this week
      prisma.lead.count({
        where: {
          createdAt: { gte: startOfWeek },
        },
      }),

      // Active leads (not WON or LOST)
      prisma.lead.count({
        where: {
          status: { notIn: ['WON', 'LOST'] },
        },
      }),

      // Demos booked
      prisma.lead.count({
        where: {
          status: 'DEMO_BOOKED',
        },
      }),

      // Won leads
      prisma.lead.count({
        where: {
          status: 'WON',
        },
      }),

      // Lost leads
      prisma.lead.count({
        where: {
          status: 'LOST',
        },
      }),

      // Today's follow-ups (including call tasks)
      prisma.lead.findMany({
        where: {
          nextContactAt: {
            lte: now,
          },
          status: { notIn: ['WON', 'LOST'] },
        },
        select: {
          id: true,
          orgName: true,
          status: true,
          nextContactAt: true,
          assignedToUserId: true,
          User: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          LeadActivity: {
            where: {
              type: 'CALL',
            },
            orderBy: {
              createdAt: 'desc',
            },
            take: 1,
            select: {
              outcome: true,
              createdAt: true,
            },
          },
        },
        orderBy: {
          nextContactAt: 'asc',
        },
      }),

      // Email tasks (leads ready for email outreach)
      prisma.lead.findMany({
        where: {
          nextContactAt: {
            lte: now,
          },
          emailOutreachCompleted: false, // Since it has @default(false), this should work
          status: { 
            notIn: ['WON', 'LOST'] 
          },
          contactEmail: { 
            not: null 
          },
        },
        select: {
          id: true,
          orgName: true,
          contactName: true,
          contactEmail: true,
          lastEmailStage: true,
          nextContactAt: true,
          lastEmailSentAt: true,
          emailOutreachCompleted: true,
        },
        orderBy: {
          nextContactAt: 'asc',
        },
        take: 20,
      }),

      // Recent activities (last 10)
      prisma.leadActivity.findMany({
        take: 10,
        select: {
          id: true,
          type: true,
          description: true,
          outcome: true,
          createdAt: true,
          leadId: true,
          createdByUserId: true,
          Lead: {
            select: {
              id: true,
              orgName: true,
            },
          },
          User: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
    ])

    // Calculate potential MRR (sum of estimatedStudents * £2 for active + demo + interested leads)
    const potentialMRRLeads = await prisma.lead.findMany({
      where: {
        status: { in: ['NEW', 'CONTACTED', 'FOLLOW_UP', 'DEMO_BOOKED', 'ON_HOLD'] },
        estimatedStudents: { not: null },
      },
      select: {
        estimatedStudents: true,
      },
    })

    const potentialMRR = potentialMRRLeads.reduce((sum, lead) => {
      return sum + ((lead.estimatedStudents || 0) * 2)
    }, 0)

    // Calculate conversion rate
    const conversionRate = totalLeads > 0 
      ? ((wonLeads / totalLeads) * 100).toFixed(1)
      : '0.0'

    return NextResponse.json({
      stats: {
        totalLeads,
        newLeadsThisWeek,
        activeLeads,
        demosBooked,
        wonLeads,
        lostLeads,
        conversionRate: parseFloat(conversionRate),
        potentialMRR,
      },
      todayFollowUps: todayFollowUps.map(lead => ({
        id: lead.id,
        orgName: lead.orgName,
        status: lead.status,
        nextContactAt: lead.nextContactAt?.toISOString() || null,
        AssignedTo: lead.User ? {
          id: lead.User.id,
          name: lead.User.name,
          email: lead.User.email,
        } : null,
        lastCallOutcome: lead.LeadActivity?.[0]?.outcome || null,
        hasCallActivity: (lead.LeadActivity?.length || 0) > 0,
      })),
      emailTasks: emailTasks.map(lead => ({
        id: lead.id,
        orgName: lead.orgName,
        contactName: lead.contactName,
        contactEmail: lead.contactEmail,
        lastEmailStage: lead.lastEmailStage,
        nextContactAt: lead.nextContactAt?.toISOString() || null,
        lastEmailSentAt: lead.lastEmailSentAt?.toISOString() || null,
      })),
      recentActivities: recentActivities.map(activity => ({
        id: activity.id,
        type: activity.type,
        description: activity.description,
        outcome: activity.outcome,
        createdAt: activity.createdAt.toISOString(),
        Lead: activity.Lead,
        CreatedBy: activity.User ? {
          id: activity.User.id,
          name: activity.User.name,
          email: activity.User.email,
        } : null,
      })),
    })
  } catch (error: any) {
    logger.error('Error fetching lead stats', error)
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { 
        error: 'Failed to fetch lead stats',
        ...(isDevelopment && {
          details: error?.message,
          name: error?.name,
          code: error?.code,
          meta: error?.meta,
          stack: error?.stack
        })
      },
      { status: 500 }
    )
  }
}

export const GET = withRateLimit(handleGET)

