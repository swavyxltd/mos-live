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

    // Get demo org ID to exclude from counts
    const demoOrg = await prisma.org.findUnique({
      where: { slug: 'leicester-islamic-centre' },
      select: { id: true }
    })

    // Get total active organizations (excluding demo org)
    const totalOrgs = await prisma.org.count({
      where: { 
        status: 'ACTIVE',
        slug: { not: 'leicester-islamic-centre' }
      }
    })

    // Get total active students across all orgs (excluding demo org)
    const totalStudents = await prisma.student.count({
      where: { 
        isArchived: false,
        ...(demoOrg ? { orgId: { not: demoOrg.id } } : {})
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

