import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveOrg } from '@/lib/org'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { withRateLimit } from '@/lib/api-middleware'

async function handleGET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const org = await getActiveOrg()
    if (!org) {
      return NextResponse.json(
        { error: 'Organisation not found' },
        { status: 404 }
      )
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // Get pending applications (NEW and REVIEWED are pending review)
    const pendingApplications = await prisma.application.count({
      where: {
        orgId: org.id,
        status: { in: ['NEW', 'REVIEWED'] }
      }
    })

    // Get overdue payments
    const currentMonthStr = today.toISOString().substring(0, 7)
    const overduePayments = await prisma.monthlyPaymentRecord.count({
      where: {
        orgId: org.id,
        status: { in: ['OVERDUE', 'LATE'] },
        month: currentMonthStr
      }
    })

    // Get pending invoices
    const pendingInvoices = await prisma.invoice.count({
      where: {
        orgId: org.id,
        status: 'PENDING',
        dueDate: { lte: tomorrow }
      }
    })

    // Get today's classes that need attendance
    const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][today.getDay()]
    const allClasses = await prisma.class.findMany({
      where: {
        orgId: org.id,
        isArchived: false
      },
      select: {
        id: true,
        name: true,
        schedule: true
      }
    })

    const todaysClasses = allClasses.filter(cls => {
      if (!cls.schedule) return false
      try {
        const schedule = typeof cls.schedule === 'string' ? JSON.parse(cls.schedule) : cls.schedule
        const scheduleDays = (schedule?.days || []).map((d: string) => d.toLowerCase())
        return scheduleDays.includes(dayOfWeek)
      } catch {
        return false
      }
    })

    // Check which classes have attendance marked for today
    const classesWithAttendance = await prisma.attendance.findMany({
      where: {
        orgId: org.id,
        date: {
          gte: today,
          lt: tomorrow
        }
      },
      select: {
        classId: true
      }
    })

    // Get unique classIds that have attendance marked
    const markedClassIds = new Set(classesWithAttendance.map(a => a.classId))
    const classesNeedingAttendance = todaysClasses.filter(cls => !markedClassIds.has(cls.id))

    // Get today's events
    const todaysEvents = await prisma.event.findMany({
      where: {
        orgId: org.id,
        date: {
          gte: today,
          lt: tomorrow
        }
      },
      select: {
        id: true,
        title: true,
        date: true,
        type: true
      }
    })

    const tasks = []

    // Add real tasks if they exist
    if (pendingApplications > 0) {
      tasks.push({
        id: 'applications',
        title: 'Review Applications',
        description: `${pendingApplications} application${pendingApplications !== 1 ? 's' : ''} pending review`,
        count: pendingApplications,
        priority: 'high',
        link: '/applications?status=NEW',
        icon: 'FileText'
      })
    }

    if (overduePayments > 0) {
      tasks.push({
        id: 'overdue-payments',
        title: 'Follow Up on Overdue Payments',
        description: `${overduePayments} payment${overduePayments !== 1 ? 's' : ''} overdue`,
        count: overduePayments,
        priority: 'high',
        link: '/payments?filter=overdue',
        icon: 'AlertCircle'
      })
    }

    if (pendingInvoices > 0) {
      tasks.push({
        id: 'pending-invoices',
        title: 'Send Pending Invoices',
        description: `${pendingInvoices} invoice${pendingInvoices !== 1 ? 's' : ''} due today or overdue`,
        count: pendingInvoices,
        priority: 'medium',
        link: '/invoices?status=PENDING',
        icon: 'DollarSign'
      })
    }

    if (classesNeedingAttendance.length > 0) {
      tasks.push({
        id: 'attendance',
        title: 'Mark Today\'s Attendance',
        description: `${classesNeedingAttendance.length} class${classesNeedingAttendance.length !== 1 ? 'es' : ''} need attendance marked`,
        count: classesNeedingAttendance.length,
        priority: 'high',
        link: '/attendance?date=today',
        icon: 'UserCheck'
      })
    }

    if (todaysEvents.length > 0) {
      tasks.push({
        id: 'events',
        title: 'Today\'s Events',
        description: `${todaysEvents.length} event${todaysEvents.length !== 1 ? 's' : ''} scheduled today`,
        count: todaysEvents.length,
        priority: 'low',
        link: '/calendar?date=today',
        icon: 'Calendar'
      })
    }

    return NextResponse.json({ tasks })
  } catch (error: any) {
    logger.error('Error fetching today\'s tasks', {
      error: error?.message,
      stack: error?.stack
    })
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { 
        error: 'Failed to fetch today\'s tasks',
        tasks: [], // Always return tasks array even on error
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}

export const GET = withRateLimit(handleGET)

