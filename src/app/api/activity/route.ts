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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const org = await getActiveOrg()
    if (!org) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '10', 10)
    const userId = searchParams.get('userId') // Filter by user
    const skip = (page - 1) * limit

    // First, get all admin/staff user IDs for this org
    const adminStaffMemberships = await prisma.userOrgMembership.findMany({
      where: {
        orgId: org.id,
        role: { in: ['ADMIN', 'STAFF', 'OWNER'] } // Include OWNER as well
      },
      select: {
        userId: true
      }
    })

    const adminStaffUserIds = adminStaffMemberships.map(m => m.userId)

    // Build where clause - only show admin/staff activity
    const whereClause: any = {
      orgId: org.id
    }

    // Only filter by admin/staff if we have users, otherwise return empty
    if (adminStaffUserIds.length > 0) {
      whereClause.actorUserId = {
        in: adminStaffUserIds
      }
    } else {
      // No admin/staff users, return empty result
      logger.warn('No admin/staff users found for org', { orgId: org.id })
      return NextResponse.json({
        logs: [],
        users: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0
        }
      })
    }

    // Add user filter if provided
    if (userId) {
      whereClause.actorUserId = userId
    }

    // Get total count
    const total = await prisma.auditLog.count({
      where: whereClause
    })

    // Get paginated audit logs (without User relation to avoid Prisma conflicts)
    const logs = await prisma.auditLog.findMany({
      where: whereClause,
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: limit
    })

    // Get user IDs and fetch users separately
    const userIds = logs.map(log => log.actorUserId).filter(Boolean) as string[]
    const users = userIds.length > 0 ? await prisma.user.findMany({
      where: {
        id: { in: userIds }
      },
      select: {
        id: true,
        name: true,
        email: true
      }
    }) : []
    
    const userMap = new Map(users.map(u => [u.id, u]))
    
    // Get user roles separately
    const userRoles = userIds.length > 0 ? await prisma.userOrgMembership.findMany({
      where: {
        userId: { in: userIds },
        orgId: org.id
      },
      select: {
        userId: true,
        role: true
      }
    }) : []
    
    const roleMap = new Map(userRoles.map(ur => [ur.userId, ur.role]))

    // Get list of admin/staff users for filter dropdown
    const adminStaffUsers = await prisma.userOrgMembership.findMany({
      where: {
        orgId: org.id,
        role: { in: ['ADMIN', 'STAFF', 'OWNER'] } // Include OWNER as well
      },
      include: {
        User: true
      },
      orderBy: {
        User: {
          name: 'asc'
        }
      }
    })

    const filterUsers = adminStaffUsers.map(m => ({
      id: m.User.id,
      name: m.User.name || m.User.email || 'Unknown',
      email: m.User.email || '',
      role: m.role
    }))

    // Format logs for frontend
    const formattedLogs = logs.map(log => {
      let actionText = log.action
      let actionIcon = 'Activity'
      
      // Combine action and targetType for better formatting
      const combinedAction = `${log.action}_${log.targetType}`
      
      // Format action text - check combined first, then individual action
      const actionMap: Record<string, string> = {
        'CREATE': 'Created',
        'UPDATE': 'Updated',
        'DELETE': 'Deleted',
        'ARCHIVE': 'Archived',
        'UNARCHIVE': 'Unarchived',
        'RECORD_CASH_PAYMENT': 'Recorded cash payment',
        'SEND_MESSAGE': 'Sent message',
        'BULK_ATTENDANCE': 'Updated attendance',
        'GENERATE_INVOICES': 'Generated invoices',
        'GENERATE_MONTHLY_INVOICES': 'Generated monthly invoices',
        'UPDATE_INVOICE': 'Updated invoice',
        'DELETE_INVOICE': 'Deleted invoice',
        'CREATE_STUDENT': 'Created student',
        'UPDATE_STUDENT': 'Updated student',
        'DELETE_STUDENT': 'Deleted student',
        'ARCHIVE_STUDENT': 'Archived student',
        'STAFF_ARCHIVED': 'Archived staff member',
        'STAFF_UNARCHIVED': 'Unarchived staff member',
        'CLASS_ARCHIVED': 'Archived class',
        'CLASS_UNARCHIVED': 'Unarchived class',
        'CREATE_INVOICE': 'Created invoice',
        'CREATE_PAYMENT': 'Created payment',
        'UPDATE_PAYMENT': 'Updated payment',
        // Combined action + targetType patterns
        'UPDATE_STUDENT': 'Updated student',
        'CREATE_STUDENT': 'Created student',
        'DELETE_STUDENT': 'Deleted student',
        'ARCHIVE_STUDENT': 'Archived student',
        'UPDATE_INVOICE': 'Updated invoice',
        'CREATE_INVOICE': 'Created invoice',
        'DELETE_INVOICE': 'Deleted invoice',
        'UPDATE_CLASS': 'Updated class',
        'CREATE_CLASS': 'Created class',
        'DELETE_CLASS': 'Deleted class',
        'ARCHIVE_CLASS': 'Archived class'
      }
      
      // Try combined action first, then individual action
      if (actionMap[combinedAction]) {
        actionText = actionMap[combinedAction]
      } else if (actionMap[log.action]) {
        // If we have a base action, check if it already includes the target type
        const baseAction = actionMap[log.action]
        // Only add target type if the base action doesn't already include it
        // (e.g., "Recorded cash payment" already includes "payment", so don't add it again)
        if (!baseAction.toLowerCase().includes(log.targetType.toLowerCase())) {
          const targetType = log.targetType.toLowerCase()
          actionText = `${baseAction} ${targetType}`
        } else {
          actionText = baseAction
        }
      } else {
        // If not in map, format the action name nicely
        actionText = log.action
          .replace(/_/g, ' ')
          .toLowerCase()
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ')
        // Add target type if available and not already included
        if (log.targetType && !actionText.toLowerCase().includes(log.targetType.toLowerCase())) {
          actionText += ` ${log.targetType.toLowerCase()}`
        }
      }
      
      // Determine icon based on action and targetType
      const actionLower = log.action.toLowerCase()
      const targetLower = log.targetType.toLowerCase()
      
      if (actionLower.includes('payment') || actionLower.includes('invoice') || targetLower === 'invoice' || targetLower === 'payment') {
        actionIcon = 'DollarSign'
      } else if (actionLower.includes('student') || targetLower === 'student') {
        actionIcon = 'Users'
      } else if (actionLower.includes('class') || targetLower === 'class') {
        actionIcon = 'BookOpen'
      } else if (actionLower.includes('message') || targetLower === 'message') {
        actionIcon = 'MessageSquare'
      } else if (actionLower.includes('attendance') || targetLower === 'attendance') {
        actionIcon = 'UserCheck'
      }

      // Parse data if it's a JSON string
      let parsedData: any = null
      try {
        parsedData = log.data ? (typeof log.data === 'string' ? JSON.parse(log.data) : log.data) : null
      } catch (e) {
        // Data is not JSON, keep as is
      }

      return {
        id: log.id,
        action: log.action,
        actionText,
        actionIcon,
        targetType: log.targetType,
        targetId: log.targetId,
        data: parsedData,
        user: log.actorUserId && userMap.has(log.actorUserId) ? {
          id: log.actorUserId,
          name: userMap.get(log.actorUserId)!.name || userMap.get(log.actorUserId)!.email || 'Unknown',
          email: userMap.get(log.actorUserId)!.email || '',
          role: roleMap.get(log.actorUserId) || 'STAFF'
        } : null,
        createdAt: log.createdAt.toISOString(),
        timestamp: log.createdAt.toLocaleString()
      }
    })

    const totalPages = total > 0 ? Math.ceil(total / limit) : 1

    return NextResponse.json({
      logs: formattedLogs,
      users: filterUsers,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    })
  } catch (error: any) {
    logger.error('Error fetching activity logs', error)
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { 
        error: 'Failed to fetch activity logs',
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}

export const GET = withRateLimit(handleGET)

