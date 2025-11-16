export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveOrg } from '@/lib/org'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { withRateLimit } from '@/lib/api-middleware'

// GET /api/org/contact-info - Get organization contact information
async function handleGET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const org = await getActiveOrg()
    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Get organization contact information
    const orgData = await prisma.org.findUnique({
      where: { id: org.id },
      select: {
        name: true,
        address: true,
        phone: true,
        email: true,
        officeHours: true
      }
    })

    return NextResponse.json({
      name: orgData?.name || org.name,
      address: orgData?.address || 'Contact information not set',
      phone: orgData?.phone || 'Contact information not set',
      email: orgData?.email || 'Contact information not set',
      officeHours: orgData?.officeHours || 'Contact information not set'
    })

  } catch (error: any) {
    logger.error('Error fetching organization contact info', error)
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { 
        error: 'Internal server error',
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}

export const GET = withRateLimit(handleGET)
