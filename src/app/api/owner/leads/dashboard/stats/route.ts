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
        include: {
          AssignedTo: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          Activities: {
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
          emailOutreachCompleted: {
            not: true, // This handles both false and null
          },
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
          Lead: {
            select: {
              id: true,
              orgName: true,
            },
          },
          CreatedBy: {
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

    // Calculate potential MRR (sum of estimatedStudents * 1 for active + demo + interested leads)
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
      return sum + (lead.estimatedStudents || 0)
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
        nextContactAt: lead.nextContactAt?.toISOString(),
        AssignedTo: lead.AssignedTo,
        lastCallOutcome: lead.Activities[0]?.outcome || null,
        hasCallActivity: lead.Activities.length > 0,
      })),
      emailTasks: emailTasks.map(lead => ({
        id: lead.id,
        orgName: lead.orgName,
        contactName: lead.contactName,
        contactEmail: lead.contactEmail,
        lastEmailStage: lead.lastEmailStage,
        nextContactAt: lead.nextContactAt?.toISOString(),
        lastEmailSentAt: lead.lastEmailSentAt?.toISOString(),
      })),
      recentActivities,
    })
  } catch (error: any) {
    console.error('Error fetching lead stats:', error)
    console.error('Error stack:', error.stack)
    console.error('Error name:', error.name)
    return NextResponse.json(
      { 
        error: 'Failed to fetch lead stats',
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? {
          message: error.message,
          name: error.name,
          stack: error.stack,
        } : undefined
      },
      { status: 500 }
    )
  }
}

export const GET = withRateLimit(handleGET)

