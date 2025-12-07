import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { withRateLimit } from '@/lib/api-middleware'

async function handleGET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || !session.user.isSuperAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get demo org IDs to exclude from counts
    const demoOrgs = await prisma.org.findMany({
      where: {
        OR: [
          { slug: 'leicester-islamic-centre' },
          { slug: 'test-islamic-school' }
        ]
      },
      select: { id: true }
    })
    const demoOrgIds = demoOrgs.map(org => org.id)

    // Get total active organizations (excluding demo orgs)
    const totalOrgs = await prisma.org.count({
      where: { 
        status: 'ACTIVE',
        slug: { 
          notIn: ['leicester-islamic-centre', 'test-islamic-school']
        }
      }
    })

    // Get total active students across all orgs (excluding demo orgs and demo students)
    const totalStudents = await prisma.student.count({
      where: { 
        isArchived: false,
        // Exclude demo orgs
        ...(demoOrgIds.length > 0 ? { orgId: { notIn: demoOrgIds } } : {}),
        // Exclude demo students (IDs starting with "demo-student-")
        NOT: {
          id: { startsWith: 'demo-student-' }
        }
      }
    })

    // Get platform settings to calculate expected revenue
    const settings = await prisma.platform_settings.findFirst()
    const basePricePerStudent = settings?.basePricePerStudent || 100 // in pence
    const expectedMonthlyRevenue = (totalStudents * basePricePerStudent) / 100 // convert to pounds

    // Format revenue with comma separators and 2 decimal places
    const formattedRevenue = expectedMonthlyRevenue.toLocaleString('en-GB', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })

    return NextResponse.json({
      totalOrgs,
      totalStudents,
      expectedMonthlyRevenue: `£${formattedRevenue}`
    })
  } catch (error: any) {
    logger.error('Error fetching billing stats', error)
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { 
        error: 'Failed to fetch billing stats',
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}

export const GET = withRateLimit(handleGET)

