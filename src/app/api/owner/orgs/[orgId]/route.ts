import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { withRateLimit } from '@/lib/api-middleware'

// GET /api/owner/orgs/[orgId] - Get full organization details (owner only)
async function handleGET(
  request: NextRequest,
  { params }: { params: { orgId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    // Only allow super admins (owners)
    if (!session?.user?.id || !session.user.isSuperAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { orgId } = params

    // Get full organization details
    const org = await prisma.org.findUnique({
      where: { id: orgId },
      select: {
        id: true,
        name: true,
        slug: true,
        address: true,
        addressLine1: true,
        city: true,
        postcode: true,
        phone: true,
        publicPhone: true,
        email: true,
        publicEmail: true,
        timezone: true,
        officeHours: true,
        settings: true,
        createdAt: true,
        updatedAt: true
      }
    })

    if (!org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    // Parse settings JSON
    const settings = org.settings ? JSON.parse(org.settings) : {}

    // Build full address
    let fullAddress = org.address || ''
    if (!fullAddress && (org.addressLine1 || org.city || org.postcode)) {
      const addressParts = []
      if (org.addressLine1) addressParts.push(org.addressLine1)
      if (org.city) addressParts.push(org.city)
      if (org.postcode) addressParts.push(org.postcode)
      fullAddress = addressParts.join(', ')
    }

    return NextResponse.json({
      id: org.id,
      name: org.name,
      slug: org.slug,
      address: fullAddress,
      addressLine1: org.addressLine1 || '',
      city: org.city || '',
      postcode: org.postcode || '',
      phone: org.phone || '',
      publicPhone: org.publicPhone || '',
      email: org.email || '',
      publicEmail: org.publicEmail || '',
      timezone: org.timezone || 'Europe/London',
      officeHours: org.officeHours || '',
      description: settings.description || '',
      website: settings.website || '',
      established: settings.established || '',
      studentCapacity: settings.studentCapacity || '',
      createdAt: org.createdAt instanceof Date ? org.createdAt.toISOString() : org.createdAt,
      updatedAt: org.updatedAt instanceof Date ? org.updatedAt.toISOString() : org.updatedAt
    })
  } catch (error: any) {
    logger.error('Error fetching org details', error)
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { 
        error: 'Failed to fetch organization details',
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}

export const GET = withRateLimit(handleGET)

