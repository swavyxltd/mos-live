import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    // Only allow super admins (owners)
    if (!session?.user?.id || !session.user.isSuperAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const now = new Date()
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    // Get user stats
    const totalUsers = await prisma.user.count({
      where: { isArchived: false }
    })

    const adminUsers = await prisma.userOrgMembership.count({
      where: { role: 'ADMIN' }
    })

    const staffUsers = await prisma.userOrgMembership.count({
      where: { role: 'STAFF' }
    })

    const parentUsers = await prisma.userOrgMembership.count({
      where: { role: 'PARENT' }
    })

    const newUsersThisMonth = await prisma.user.count({
      where: {
        createdAt: { gte: thisMonth },
        isArchived: false
      }
    })

    const inactiveUsers = await prisma.user.count({
      where: {
        isArchived: true
      }
    })

    // Get all users with their details
    const users = await prisma.user.findMany({
      where: { isArchived: false },
      include: {
        memberships: {
          include: {
            org: { select: { name: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    const allUsers = users.map(user => {
      const membership = Array.isArray(user.memberships) && user.memberships.length > 0 ? user.memberships[0] : null
      const role = user.isSuperAdmin ? 'OWNER' : (membership?.role || null)
      return {
        id: user.id,
        name: user.name || 'Unknown',
        email: user.email || '',
        role: role,
        orgName: membership?.org?.name || null,
        lastActive: user.updatedAt ? user.updatedAt.toISOString() : new Date().toISOString(),
        status: user.isArchived ? 'inactive' : 'active',
        joinDate: user.createdAt ? user.createdAt.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        phone: user.phone || null,
        location: null, // Could add location field later
        students: [] // Would need to query if user is a parent
      }
    })

    // Get role distribution
    const roleDistribution = [
      { role: 'OWNER', count: await prisma.user.count({ where: { isSuperAdmin: true, isArchived: false } }), percentage: 0 },
      { role: 'ADMIN', count: adminUsers, percentage: 0 },
      { role: 'STAFF', count: staffUsers, percentage: 0 },
      { role: 'PARENT', count: parentUsers, percentage: 0 }
    ]

    const totalRoleCount = roleDistribution.reduce((sum, r) => sum + r.count, 0)
    roleDistribution.forEach(r => {
      r.percentage = totalRoleCount > 0 ? Math.round((r.count / totalRoleCount) * 100) : 0
    })

    // Get top orgs by user count
    let topOrgsByUsers = []
    try {
      const orgsWithUsers = await prisma.org.findMany({
        where: { status: 'ACTIVE' },
        include: {
          _count: {
            select: {
              memberships: true
            }
          }
        },
        orderBy: {
          _count: {
            memberships: 'desc'
          }
        },
        take: 5
      })

      topOrgsByUsers = orgsWithUsers.map(org => ({
        orgName: org.name,
        userCount: org._count.memberships,
        activeUsers: org._count.memberships // Simplified for now
      }))
    } catch (error) {
      console.error('Error fetching top orgs:', error)
      topOrgsByUsers = []
    }

    return NextResponse.json({
      stats: {
        totalUsers,
        activeUsers: totalUsers - inactiveUsers,
        newUsersThisMonth,
        adminUsers,
        staffUsers,
        parentUsers,
        inactiveUsers
      },
      allUsers,
      activity: {
        loginsToday: 0, // Would need login tracking
        loginsThisWeek: 0,
        averageSessionDuration: 0,
        mostActiveTime: null,
        topFeatures: []
      },
      roleDistribution,
      topOrgsByUsers
    })
  } catch (error: any) {
    console.error('Error fetching user stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user stats', details: error.message },
      { status: 500 }
    )
  }
}

