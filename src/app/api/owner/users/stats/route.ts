import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { withRateLimit } from '@/lib/api-middleware'

async function handleGET(request: NextRequest) {
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

    // Get demo org to exclude from queries - "Test Islamic School"
    let demoOrg = await prisma.org.findFirst({
      where: { 
        OR: [
          { slug: 'test-islamic-school' },
          { name: { contains: 'Test Islamic School', mode: 'insensitive' } },
          { slug: { contains: 'test', mode: 'insensitive' } },
          { slug: 'leicester-islamic-centre' },
          { name: { contains: 'Leicester', mode: 'insensitive' } }
        ]
      },
      select: { id: true, slug: true, name: true }
    })
    
    if (demoOrg) {
      logger.info(`Excluding demo org: ${demoOrg.name} (${demoOrg.slug})`)
    } else {
      logger.warn('Demo org not found - all users will be included')
    }

    // Get demo org user IDs for exclusion (needed for count queries)
    const demoOrgUserIds = demoOrg 
      ? (await prisma.userOrgMembership.findMany({
          where: { orgId: demoOrg.id },
          select: { userId: true }
        })).map(m => m.userId)
      : []
    
    // Also exclude specific demo user emails
    const excludedEmails = ['hassan.teacher@test.com', 'fatima.teacher@test.com']

    // Parallelize all count queries for better performance (excluding demo org users)
    const [
      totalUsers,
      adminUsers,
      staffUsers,
      parentUsers,
      newUsersThisMonth,
      inactiveUsers,
      ownerCount
    ] = await Promise.all([
      prisma.user.count({
        where: { 
          isArchived: false,
          isSuperAdmin: false, // Exclude owner accounts
          email: { notIn: excludedEmails },
          ...(demoOrgUserIds.length > 0 ? {
            id: { notIn: demoOrgUserIds }
          } : {})
        }
      }),
      prisma.userOrgMembership.count({
        where: { 
          role: 'ADMIN',
          ...(demoOrg ? {
            orgId: { not: demoOrg.id }
          } : {})
        }
      }),
      prisma.userOrgMembership.count({
        where: { 
          role: 'STAFF',
          ...(demoOrg ? {
            orgId: { not: demoOrg.id }
          } : {})
        }
      }),
      // Count parent memberships, but exclude users who have any demo org membership
      demoOrg && demoOrgUserIds.length > 0
        ? prisma.userOrgMembership.count({
            where: { 
              role: 'PARENT',
              orgId: { not: demoOrg.id },
              userId: { notIn: demoOrgUserIds } // Exclude users who have any demo org membership
            }
          })
        : prisma.userOrgMembership.count({
            where: { 
              role: 'PARENT',
              ...(demoOrg ? {
                orgId: { not: demoOrg.id }
              } : {})
            }
          }),
      prisma.user.count({
        where: {
          createdAt: { gte: thisMonth },
          isArchived: false,
          isSuperAdmin: false, // Exclude owner accounts
          email: { notIn: excludedEmails },
          ...(demoOrgUserIds.length > 0 ? {
            id: { notIn: demoOrgUserIds }
          } : {})
        }
      }),
      prisma.user.count({
        where: {
          isArchived: true,
          isSuperAdmin: false, // Exclude owner accounts
          email: { notIn: excludedEmails },
          ...(demoOrgUserIds.length > 0 ? {
            id: { notIn: demoOrgUserIds }
          } : {})
        }
      }),
      prisma.user.count({ 
        where: { 
          isSuperAdmin: true, 
          isArchived: false,
          email: { notIn: excludedEmails },
          ...(demoOrgUserIds.length > 0 ? {
            id: { notIn: demoOrgUserIds }
          } : {})
        } 
      })
    ])

    // Get all users with their primary membership (optimized query)
    // Exclude users who have ANY membership in demo org using NOT clause (same pattern as dashboard)
    // Also exclude specific demo user emails that shouldn't be shown
    const allUsersQuery = await prisma.user.findMany({
      where: { 
        isArchived: false,
        isSuperAdmin: false, // Exclude owner accounts
        email: { notIn: excludedEmails }, // excludedEmails defined above
        ...(demoOrg ? {
          NOT: {
            UserOrgMembership: {
              some: {
                orgId: demoOrg.id
              }
            }
          }
        } : {})
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isSuperAdmin: true,
        createdAt: true,
        updatedAt: true,
        UserOrgMembership: {
          select: {
            role: true,
            orgId: true,
            Org: {
              select: {
                id: true,
                name: true,
                slug: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // No need to filter in JavaScript - already filtered by Prisma
    const filteredUsers = allUsersQuery

    const allUsers = filteredUsers.map(user => {
      // Get first non-demo org membership, or first membership if no demo org
      const memberships = user.UserOrgMembership || []
      const membership = demoOrg
        ? memberships.find(m => m.Org?.id !== demoOrg.id && m.Org?.slug !== demoOrg.slug) || memberships[0] || null
        : memberships[0] || null
      const role = user.isSuperAdmin ? 'OWNER' : (membership?.role || null)
      return {
        id: user.id,
        name: user.name || 'Unknown',
        email: user.email || '',
        role: role,
        orgName: membership?.Org?.name || null,
        lastActive: user.updatedAt ? user.updatedAt.toISOString() : new Date().toISOString(),
        status: 'active',
        joinDate: user.createdAt ? user.createdAt.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        phone: user.phone || null,
        location: null, // Could add location field later
        students: [] // Would need to query if user is a parent
      }
    })

    // Get role distribution (exclude OWNER from display since we're excluding owners from the page)
    const roleDistribution = [
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
              UserOrgMembership: true
            }
          }
        },
        orderBy: {
          _count: {
            UserOrgMembership: 'desc'
          }
        },
        take: 5
      })

      topOrgsByUsers = orgsWithUsers.map(org => ({
        orgName: org.name,
        userCount: org._count.UserOrgMembership,
        activeUsers: org._count.UserOrgMembership // Simplified for now
      }))
    } catch (error) {
      logger.error('Error fetching top orgs', error)
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
    logger.error('Error fetching user stats', error)
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { 
        error: 'Failed to fetch user stats',
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}

export const GET = withRateLimit(handleGET)

