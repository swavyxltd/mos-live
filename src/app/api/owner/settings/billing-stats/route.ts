import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || !session.user.isSuperAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get total active organizations
    const totalOrgs = await prisma.org.count({
      where: { status: 'ACTIVE' }
    })

    // Get total active students across all orgs
    const totalStudents = await prisma.student.count({
      where: { isArchived: false }
    })

    // Get platform settings to calculate expected revenue
    const settings = await prisma.platformSettings.findFirst()
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
    console.error('Error fetching billing stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch billing stats', details: error.message },
      { status: 500 }
    )
  }
}

