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
      return NextResponse.json({ error: 'Organisation not found' }, { status: 404 })
    }

    // Check each setup requirement
    const setupStatus = {
      // 1. Payment methods for parents
      paymentMethodsConfigured: false,
      // 2. Staff added
      hasStaff: false,
      // 3. Classes added
      hasClasses: false,
      // 4. Students added
      hasStudents: false,
      // 5. Sign up link (always available, but check if students exist to share)
      signupLinkReady: false
    }

    // 1. Check payment methods for parents
    // At least one payment method should be enabled
    const hasPaymentMethods = 
      (org.acceptsCard === true && (org.stripeConnectAccountId || org.stripePublishableKey)) ||
      org.acceptsCash === true ||
      org.acceptsBankTransfer === true
    setupStatus.paymentMethodsConfigured = hasPaymentMethods

    // 2. Check if staff exists (excluding the current user if they're the only one)
    const staffCount = await prisma.userOrgMembership.count({
      where: {
        orgId: org.id,
        role: {
          in: ['ADMIN', 'STAFF']
        }
      }
    })
    setupStatus.hasStaff = staffCount > 0

    // 3. Check if classes exist
    const classesCount = await prisma.class.count({
      where: {
        orgId: org.id,
        isArchived: false
      }
    })
    setupStatus.hasClasses = classesCount > 0

    // 4. Check if students exist
    const studentsCount = await prisma.student.count({
      where: {
        orgId: org.id,
        isArchived: false
      }
    })
    setupStatus.hasStudents = studentsCount > 0

    // 5. Sign up link is ready if students exist (so parents can link to them)
    setupStatus.signupLinkReady = setupStatus.hasStudents

    // Calculate completion percentage
    const totalSteps = 5
    const completedSteps = Object.values(setupStatus).filter(Boolean).length
    const completionPercentage = Math.round((completedSteps / totalSteps) * 100)

    // Get signup link
    const signupLink = `${process.env.NEXTAUTH_URL || 'https://app.madrasah.io'}/parent/signup?org=${org.slug}`

    return NextResponse.json({
      ...setupStatus,
      completionPercentage,
      completedSteps,
      totalSteps,
      signupLink,
      orgSlug: org.slug
    })
  } catch (error: any) {
    logger.error('Error fetching setup status', error)
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { 
        error: 'Failed to fetch setup status',
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}

export const GET = withRateLimit(handleGET)
export const dynamic = 'force-dynamic'
export const revalidate = 0

