export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveOrg } from '@/lib/org'
import { prisma } from '@/lib/prisma'

// GET /api/org/contact-info - Get organization contact information
export async function GET(request: NextRequest) {
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

  } catch (error) {
    console.error('Error fetching organization contact info:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
